"use server";
/**
 * ویرایش کاتالوگ از پنل (FR-ADM-01, FR-ADM-03).
 * قیمت فقط با مجوز products.price (مدیر کل، D-042)؛ هر تغییر در تاریخچه با مقدار قبل و بعد.
 */
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { expireCatalog } from "@/lib/cache";
import { fa } from "@/content/fa";
import { db } from "@/lib/db";
import { can } from "@/modules/admin";
import { audit, staffWith } from "@/modules/admin/server";
import { sniffImage } from "@/modules/returns";
import { isFlavor } from "./flavors";
import { removeContentImage, saveContentImage } from "@/modules/content/media";
import { resetSearchCache } from "@/modules/search/server";
import {
  normalizeSku,
  normalizeSlug,
  parseAmount,
  parseAttributes,
  parseSpecForm,
  parseTags,
  suggestSku,
  validatePrices,
  validateSpecSchema,
  validSku,
  validSlug,
} from "./admin-rules";
import {
  nameFromUrl,
  PRODUCT_IMAGE_MAX,
  productImageUrl,
  removeProductImage,
  saveProductImage,
} from "./media";
import { validateSpecs, type SpecField, type SpecSchema } from "./specs";

const t = fa.admin.catalog;
export type CatalogState = {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
  id?: string;
} | null;

const str = (f: FormData, k: string, max = 200) =>
  String(f.get(k) ?? "")
    .trim()
    .slice(0, max);
const valuesOf = (f: FormData) =>
  Object.fromEntries(
    [...f.entries()].filter(([, v]) => typeof v === "string").map(([k, v]) => [k, String(v)]),
  );
const fail = (
  f: FormData,
  errors: Record<string, string>,
  message: string = t.fixErrors,
): CatalogState => ({
  ok: false,
  message,
  errors,
  values: valuesOf(f),
});

function refreshProduct(slug?: string, categorySlug?: string) {
  resetSearchCache();
  expireCatalog();
  revalidatePath("/admin/products", "layout");
  revalidatePath("/");
  if (slug) revalidatePath(`/products/${slug}`);
  if (categorySlug) revalidatePath(`/categories/${categorySlug}`);
}

const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

/** ایجاد یا ویرایش اطلاعات محصول (بدون قیمت؛ قیمت روی «نوع» است) */
export async function saveProduct(_prev: CatalogState, form: FormData): Promise<CatalogState> {
  const me = await staffWith("products.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const id = str(form, "id", 40) || null;
  const errors: Record<string, string> = {};
  const name = str(form, "name", 150);
  const slug = normalizeSlug(str(form, "slug", 80));
  const status = str(form, "status") as (typeof STATUSES)[number];
  const warrantyRaw = parseAmount(str(form, "warrantyMonths"));
  if (name.length < 3) errors.name = t.errors.name;
  if (!validSlug(slug)) errors.slug = t.errors.slug;
  if (!STATUSES.includes(status)) errors.status = t.errors.status;
  if (warrantyRaw !== null && (Number.isNaN(warrantyRaw) || warrantyRaw > 120))
    errors.warrantyMonths = t.errors.warranty;
  const [category, brand, clash] = await Promise.all([
    db.category.findUnique({ where: { id: str(form, "categoryId", 40) } }),
    db.brand.findUnique({ where: { id: str(form, "brandId", 40) } }),
    db.product.findUnique({ where: { slug }, select: { id: true } }),
  ]);
  if (!category) errors.categoryId = t.errors.category;
  if (!brand) errors.brandId = t.errors.brand;
  if (clash && clash.id !== id) errors.slug = t.errors.slugTaken;
  if (Object.keys(errors).length || !category || !brand) return fail(form, errors);

  const schema = (category.specSchema ?? []) as unknown as SpecSchema;
  const specs = parseSpecForm(schema, (k) => (form.has(k) ? String(form.get(k)) : null));
  const specErrors = validateSpecs(schema, specs);
  const existing = id
    ? await db.product.findUnique({
        where: { id },
        include: {
          variants: { select: { isActive: true, price: true } },
          category: { select: { slug: true } },
        },
      })
    : null;
  if (id && !existing) return { ok: false, message: t.errors.notFound };
  // انتشار: مشخصات الزامی کامل و دست‌کم یک «نوع» فعال با قیمت
  if (status === "PUBLISHED") {
    if (specErrors.length) return fail(form, { specs: specErrors[0]! }, specErrors[0]);
    if (!existing?.variants.some((v) => v.isActive && v.price > 0))
      return fail(form, { status: t.errors.needVariant }, t.errors.needVariant);
  } else if (specErrors.some((e) => !e.includes("الزامی")))
    return fail(form, { specs: specErrors[0]! }, specErrors[0]);

  const data = {
    name,
    slug,
    categoryId: category.id,
    brandId: brand.id,
    summary: str(form, "summary", 160) || null,
    description:
      String(form.get("description") ?? "")
        .trim()
        .slice(0, 8000) || null,
    specs: specs as Prisma.InputJsonValue,
    warrantyMonths: warrantyRaw && !Number.isNaN(warrantyRaw) ? warrantyRaw : null,
    warrantyNote: str(form, "warrantyNote", 120) || null,
    tags: parseTags(str(form, "tags", 300)),
    ...(form.get("flavorsField") === "1"
      ? { flavors: [...new Set(form.getAll("flavors").map(String))].filter(isFlavor) }
      : {}),
    status,
    seoTitle: str(form, "seoTitle", 70) || null,
    seoDescription: str(form, "seoDescription", 170) || null,
  };
  const saved = existing
    ? await db.product.update({ where: { id: existing.id }, data })
    : await db.product.create({ data });
  const changed = existing
    ? Object.fromEntries(
        Object.entries(data)
          .filter(
            ([k, v]) =>
              JSON.stringify(v) !== JSON.stringify((existing as Record<string, unknown>)[k]),
          )
          .map(([k]) => [k, true]),
      )
    : { created: true };
  await audit(me.id, existing ? "product.update" : "product.create", "product", saved.id, {
    name,
    ...changed,
  });
  refreshProduct(saved.slug, category.slug);
  if (existing && existing.slug !== saved.slug)
    refreshProduct(existing.slug, existing.category.slug);
  // مقدارها برمی‌گردند تا React پس از ارسال فرم را به مقدار قدیمی برنگرداند
  return { ok: true, message: t.saved, id: saved.id, values: valuesOf(form) };
}

/** ایجاد یا ویرایش «نوع» (رنگ، مدل) با قیمت، وزن و ابعاد */
export async function saveVariant(_prev: CatalogState, form: FormData): Promise<CatalogState> {
  const me = await staffWith("products.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const canPrice = can(me.role, "products.price");
  const productId = str(form, "productId", 40);
  const variantId = str(form, "variantId", 40) || null;
  const product = await db.product.findUnique({
    where: { id: productId },
    include: { category: { select: { slug: true } } },
  });
  if (!product) return { ok: false, message: t.errors.notFound };
  const old = variantId
    ? await db.variant.findFirst({
        where: { id: variantId, productId },
        include: { priceTiers: { where: { priceLevel: 1, minQty: 1 } } },
      })
    : null;
  if (variantId && !old) return { ok: false, message: t.errors.notFound };

  const errors: Record<string, string> = {};
  // کد کالا خالی: خودکار از نشانی محصول
  let sku = normalizeSku(str(form, "sku", 40));
  if (!sku) {
    const count = await db.variant.count({ where: { productId } });
    for (let n = count + 1; n < count + 50; n++) {
      sku = suggestSku(product.slug, n);
      if (!(await db.variant.findUnique({ where: { sku }, select: { id: true } }))) break;
    }
  }
  if (!validSku(sku)) errors.sku = t.errors.sku;
  const clash = await db.variant.findUnique({ where: { sku }, select: { id: true } });
  if (clash && clash.id !== variantId) errors.sku = t.errors.skuTaken;
  const attributes = parseAttributes(String(form.get("attributes") ?? ""));
  if (!attributes) errors.attributes = t.errors.attributes;
  const num = (k: string, max: number) => {
    const n = parseAmount(str(form, k));
    if (n !== null && (Number.isNaN(n) || n > max)) errors[k] = t.errors.number;
    return n !== null && !Number.isNaN(n) ? n : null;
  };
  const weightGrams = num("weightGrams", 500_000) ?? 0;
  const lengthCm = num("lengthCm", 500);
  const widthCm = num("widthCm", 500);
  const heightCm = num("heightCm", 500);
  const minOrderQty = Math.max(1, num("minOrderQty", 1000) ?? 1);
  let isActive = form.get("isActive") === "on";

  // قیمت: فقط مدیر کل (D-042)؛ بقیه مقدار قبلی را نگه می‌دارند
  let price = old?.price ?? 0;
  let salePrice = old?.salePrice ?? null;
  let wholesale = old?.priceTiers[0]?.price ?? null;
  let costPrice = old?.costPrice ?? null;
  if (canPrice) {
    price = parseAmount(str(form, "price")) ?? 0;
    salePrice = parseAmount(str(form, "salePrice"));
    wholesale = parseAmount(str(form, "wholesale"));
    const cost = parseAmount(str(form, "costPrice"));
    if (cost !== null && (Number.isNaN(cost) || cost <= 0)) errors.costPrice = t.errors.number;
    else costPrice = cost;
    const pe = validatePrices(price, salePrice, wholesale);
    for (const [k, v] of Object.entries(pe))
      errors[k] = t.errors[v as keyof typeof t.errors] as string;
  } else if (!old) {
    isActive = false; // نوع تازه بدون قیمت تا مدیر کل قیمت بگذارد
  }
  if (isActive && price <= 0) errors.isActive = t.errors.activeNeedsPrice;
  if (Object.keys(errors).length) return fail(form, errors);

  const data = {
    sku,
    attributes: attributes ?? {},
    price,
    salePrice,
    costPrice,
    weightGrams,
    lengthCm,
    widthCm,
    heightCm,
    minOrderQty,
    isActive,
  };
  const v = await db.$transaction(async (tx) => {
    const v = old
      ? await tx.variant.update({ where: { id: old.id }, data })
      : await tx.variant.create({
          data: { ...data, productId, inventory: { create: { onHand: 0, lowStockThreshold: 3 } } },
        });
    if (canPrice) {
      if (wholesale)
        await tx.priceTier.upsert({
          where: { variantId_priceLevel_minQty: { variantId: v.id, priceLevel: 1, minQty: 1 } },
          update: { price: wholesale },
          create: { variantId: v.id, priceLevel: 1, minQty: 1, price: wholesale },
        });
      else await tx.priceTier.deleteMany({ where: { variantId: v.id, priceLevel: 1, minQty: 1 } });
    }
    return v;
  });

  const priceDiff =
    old &&
    (old.price !== price ||
      old.salePrice !== salePrice ||
      old.costPrice !== costPrice ||
      (old.priceTiers[0]?.price ?? null) !== wholesale)
      ? {
          price: { from: old.price, to: price },
          salePrice: { from: old.salePrice, to: salePrice },
          wholesale: { from: old.priceTiers[0]?.price ?? null, to: wholesale },
          costPrice: { from: old.costPrice, to: costPrice },
        }
      : undefined;
  await audit(me.id, old ? "variant.update" : "variant.create", "product", productId, {
    sku,
    ...(priceDiff ? { prices: priceDiff } : {}),
    ...(old && old.isActive !== isActive ? { isActive } : {}),
  });
  if (priceDiff) await audit(me.id, "product.price", "product", productId, { sku, ...priceDiff });
  refreshProduct(product.slug, product.category.slug);
  return {
    ok: true,
    message: !canPrice && !old ? t.variantNeedsPrice : t.saved,
    id: v.id,
    values: old ? valuesOf(form) : undefined,
  };
}

/** بارگذاری یک تصویر (کلاینت تصویرها را یکی‌یکی می‌فرستد تا از سقف حجم درخواست رد نشود) */
export async function uploadProductImage(
  form: FormData,
): Promise<{ ok: boolean; message: string }> {
  const me = await staffWith("products.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const product = await db.product.findUnique({
    where: { id: str(form, "productId", 40) },
    include: { _count: { select: { images: true } } },
  });
  if (!product) return { ok: false, message: t.errors.notFound };
  if (product._count.images >= 12) return { ok: false, message: t.errors.tooManyImages };
  const file = form.get("file");
  if (!file || typeof file !== "object" || !("arrayBuffer" in file) || file.size === 0)
    return { ok: false, message: t.errors.imageType };
  if (file.size > PRODUCT_IMAGE_MAX) return { ok: false, message: t.errors.imageSize };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = sniffImage(bytes.subarray(0, 16));
  if (!ext) return { ok: false, message: t.errors.imageType };
  const name = await saveProductImage(bytes, ext);
  const alt = str(form, "alt", 150) || product.name;
  await db.productImage.create({
    data: {
      productId: product.id,
      url: productImageUrl(name),
      alt,
      sortOrder: product._count.images,
    },
  });
  await audit(me.id, "product.image", "product", product.id, { added: name });
  refreshProduct(product.slug);
  return { ok: true, message: t.saved };
}

/** ترتیب و متن جایگزین تصویرها (اولی تصویر اصلی است) */
export async function updateProductImages(
  productId: string,
  images: { id: string; alt: string }[],
): Promise<{ ok: boolean; message: string }> {
  const me = await staffWith("products.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  if (images.some((i) => !i.alt.trim())) return { ok: false, message: t.errors.alt };
  const product = await db.product.findUnique({
    where: { id: productId },
    include: { images: true },
  });
  if (!product) return { ok: false, message: t.errors.notFound };
  const own = new Set(product.images.map((i) => i.id));
  if (images.some((i) => !own.has(i.id))) return { ok: false, message: t.errors.notFound };
  await db.$transaction(
    images.map((i, n) =>
      db.productImage.update({
        where: { id: i.id },
        data: { sortOrder: n, alt: i.alt.trim().slice(0, 150) },
      }),
    ),
  );
  await audit(me.id, "product.image", "product", productId, { reordered: true });
  refreshProduct(product.slug);
  return { ok: true, message: t.saved };
}

export async function deleteProductImage(
  imageId: string,
): Promise<{ ok: boolean; message: string }> {
  const me = await staffWith("products.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const img = await db.productImage.findUnique({
    where: { id: imageId },
    include: { product: { select: { slug: true } } },
  });
  if (!img) return { ok: false, message: t.errors.notFound };
  await db.productImage.delete({ where: { id: imageId } });
  await removeProductImage(nameFromUrl(img.url));
  await audit(me.id, "product.image", "product", img.productId, { removed: nameFromUrl(img.url) });
  refreshProduct(img.product.slug);
  return { ok: true, message: t.saved };
}

// ───────── دسته و برند (FR-ADM-03) ─────────

export async function saveCategory(_prev: CatalogState, form: FormData): Promise<CatalogState> {
  const me = await staffWith("products.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const id = str(form, "id", 40) || null;
  const name = str(form, "name", 80);
  const slug = normalizeSlug(str(form, "slug", 80));
  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = t.errors.name;
  if (!validSlug(slug)) errors.slug = t.errors.slug;
  const clash = await db.category.findUnique({ where: { slug }, select: { id: true } });
  if (clash && clash.id !== id) errors.slug = t.errors.slugTaken;
  let schema: SpecField[] = [];
  try {
    schema = JSON.parse(String(form.get("specSchema") ?? "[]")) as SpecField[];
    if (!Array.isArray(schema)) throw new Error();
  } catch {
    errors.specSchema = t.errors.schema;
  }
  const se = errors.specSchema ? null : validateSpecSchema(schema);
  if (se) errors.specSchema = t.schemaErrors[se.problem](se.index + 1);
  if (Object.keys(errors).length) return fail(form, errors);
  const old = id ? await db.category.findUnique({ where: { id } }) : null;
  if (id && !old) return { ok: false, message: t.errors.notFound };
  // عکس دایره‌ی دسته در صفحه‌ی اصلی (اختیاری)
  let imageUrl: string | null | undefined;
  const file = form.get("image");
  if (file && typeof file === "object" && "arrayBuffer" in file && file.size > 0) {
    if (file.size > 4 * 1024 * 1024) return fail(form, { image: t.errors.imageSize });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const ext = sniffImage(bytes.subarray(0, 16));
    if (!ext) return fail(form, { image: t.errors.imageType });
    imageUrl = await saveContentImage(bytes, ext);
  } else if (form.get("removeImage") === "on") imageUrl = null;
  const data = {
    name,
    slug,
    icon: str(form, "icon", 30) || null,
    ...(imageUrl !== undefined ? { imageUrl } : {}),
    sortOrder: parseAmount(str(form, "sortOrder")) || 0,
    specSchema: schema as unknown as Prisma.InputJsonValue,
  };
  const c = old
    ? await db.category.update({ where: { id: old.id }, data })
    : await db.category.create({ data });
  if (old?.imageUrl && imageUrl !== undefined) await removeContentImage(old.imageUrl);
  await audit(me.id, old ? "category.update" : "category.create", "category", c.id, {
    name,
    fields: schema.length,
  });
  expireCatalog();
  revalidatePath("/admin/products/categories");
  revalidatePath(`/categories/${c.slug}`);
  revalidatePath("/", "layout");
  return { ok: true, message: t.saved, id: c.id };
}

export async function saveBrand(_prev: CatalogState, form: FormData): Promise<CatalogState> {
  const me = await staffWith("products.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const id = str(form, "id", 40) || null;
  const name = str(form, "name", 80);
  const slug = normalizeSlug(str(form, "slug", 80));
  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = t.errors.name;
  if (!validSlug(slug)) errors.slug = t.errors.slug;
  const clash = await db.brand.findUnique({ where: { slug }, select: { id: true } });
  if (clash && clash.id !== id) errors.slug = t.errors.slugTaken;
  if (Object.keys(errors).length) return fail(form, errors);
  const b = id
    ? await db.brand.update({ where: { id }, data: { name, slug } })
    : await db.brand.create({ data: { name, slug } });
  await audit(me.id, id ? "brand.update" : "brand.create", "brand", b.id, { name });
  expireCatalog();
  revalidatePath("/admin/products/brands");
  return { ok: true, message: t.saved, id: b.id };
}

/** انتشار یا برگرداندن به پیش‌نویس از سربرگ صفحه‌ی محصول */
export async function setProductStatus(
  productId: string,
  status: "PUBLISHED" | "DRAFT",
): Promise<{ ok: boolean; message: string }> {
  const me = await staffWith("products.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const p = await db.product.findUnique({
    where: { id: productId },
    include: { category: true, variants: { select: { isActive: true, price: true } } },
  });
  if (!p) return { ok: false, message: t.errors.notFound };
  if (status === "PUBLISHED") {
    if (!p.variants.some((v) => v.isActive && v.price > 0))
      return { ok: false, message: t.errors.needVariant };
    const errs = validateSpecs(
      (p.category.specSchema ?? []) as unknown as SpecSchema,
      (p.specs ?? {}) as Record<string, string | number | boolean>,
    );
    if (errs.length) return { ok: false, message: `${t.errors.specsMissing} ${errs[0]}` };
  }
  await db.product.update({ where: { id: p.id }, data: { status } });
  await audit(me.id, "product.update", "product", p.id, { status });
  refreshProduct(p.slug, p.category.slug);
  return { ok: true, message: status === "PUBLISHED" ? t.publishedNow : t.saved };
}
