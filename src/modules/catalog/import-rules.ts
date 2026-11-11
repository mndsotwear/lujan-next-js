/**
 * ورود گروهی محصول و قیمت از اکسل/CSV با پیش‌نمایش (FR-ADM-02، D-049، D-042، D-050) — منطق خالص.
 * قاعده: خانه‌ی خالی یعنی «تغییر نده». کد کالای موجود ← ویرایش؛ کد تازه ← نوع یا محصول تازه.
 */
import { toLatinDigits } from "@/lib/format";
import {
  normalizeSku,
  normalizeSlug,
  parseAmount,
  parseAttributes,
  validSku,
  validSlug,
} from "./admin-rules";

export const IMPORT_COLUMNS = [
  ["sku", "کد کالا (SKU)"],
  ["product", "نشانی محصول"],
  ["name", "نام محصول"],
  ["category", "دسته (نشانی)"],
  ["brand", "برند (نشانی)"],
  ["attributes", "ویژگی‌ها (کلید: مقدار؛ چند ویژگی با ؛)"],
  ["price", "قیمت"],
  ["salePrice", "قیمت تخفیفی"],
  ["wholesale", "قیمت عمده"],
  ["costPrice", "قیمت خرید"],
  ["stock", "موجودی فیزیکی"],
  ["weightGrams", "وزن (گرم)"],
  ["active", "فعال (بله/خیر)"],
] as const;
export type ImportKey = (typeof IMPORT_COLUMNS)[number][0];
export const PRICE_KEYS: ImportKey[] = ["price", "salePrice", "wholesale", "costPrice"];

export type RawRow = Partial<Record<ImportKey, string>>;

/** سطر سرستون ← نگاشت ستون؛ هم عنوان فارسی و هم کلید انگلیسی پذیرفته می‌شود */
export function mapHeaders(header: string[]): (ImportKey | null)[] {
  return header.map((h) => {
    const x = h.trim();
    // دقیق: عنوان کامل، کلید انگلیسی، یا عنوان بدون توضیح پرانتزی («قیمت» ≠ «قیمت خرید»)
    const hit = IMPORT_COLUMNS.find(
      ([k, label]) => x === label || x === k || x === label.split(" (")[0],
    );
    return hit ? hit[0] : null;
  });
}

export function toRawRows(table: string[][]): { rows: RawRow[]; missingSku: boolean } {
  const [header, ...body] = table;
  const keys = mapHeaders(header ?? []);
  if (!keys.includes("sku")) return { rows: [], missingSku: true };
  return {
    missingSku: false,
    rows: body.map((cells) => {
      const r: RawRow = {};
      keys.forEach((k, i) => {
        const v = (cells[i] ?? "").trim();
        if (k && v) r[k] = v;
      });
      return r;
    }),
  };
}

export type ExistingVariant = {
  sku: string;
  productSlug: string;
  price: number;
  salePrice: number | null;
  wholesale: number | null;
  costPrice: number | null;
  onHand: number;
  reserved: number;
  weightGrams: number;
  isActive: boolean;
  attributes: Record<string, string>;
};

export type Change = {
  field: ImportKey;
  from: string | number | boolean | null;
  to: string | number | boolean | null;
};
export type PlanRow = {
  line: number;
  sku: string;
  action: "update" | "create-variant" | "create-product" | "unchanged" | "error";
  changes: Change[];
  errors: string[];
  warnings: string[];
  /** داده‌ی آماده برای اعمال */
  data?: {
    productSlug: string;
    name?: string;
    category?: string;
    brand?: string;
    attributes?: Record<string, string>;
    price?: number;
    salePrice?: number | null;
    wholesale?: number | null;
    costPrice?: number | null;
    stock?: number;
    weightGrams?: number;
    isActive?: boolean;
  };
};

export const IMPORT_MESSAGES = {
  sku: "کد کالا نامعتبر است",
  duplicate: "این کد کالا در فایل تکرار شده",
  number: (f: string) => `«${f}» باید عدد صحیح نامنفی باشد`,
  salePrice: "قیمت تخفیفی باید کمتر از قیمت باشد",
  active: "«فعال» باید «بله» یا «خیر» باشد",
  stockBelowReserved: "موجودی کمتر از مقدار رزروشده برای سفارش‌های در انتظار است",
  newNeeds: "برای کد تازه «نشانی محصول» لازم است",
  newProductNeeds: "برای محصول تازه نام، دسته و برند لازم است",
  slug: "نشانی محصول نامعتبر است",
  category: "دسته پیدا نشد",
  brand: "برند پیدا نشد",
  attributes: "ویژگی‌ها به شکل «کلید: مقدار» با ؛ بین ویژگی‌ها",
  priceIgnored: "ستون‌های قیمت فقط با مجوز مدیر کل اعمال می‌شوند؛ نادیده گرفته شد",
  newWithoutPrice: "بدون قیمت، نوع تازه غیرفعال ساخته می‌شود",
} as const;

const yesNo = (s: string): boolean | null => {
  const v = s.trim().toLowerCase();
  if (["بله", "آری", "yes", "1", "true", "فعال"].includes(v)) return true;
  if (["خیر", "نه", "no", "0", "false", "غیرفعال"].includes(v)) return false;
  return null;
};

export function planImport(
  rows: RawRow[],
  ctx: {
    variants: Map<string, ExistingVariant>;
    productSlugs: Set<string>;
    categories: Set<string>;
    brands: Set<string>;
    canPrice: boolean;
  },
): PlanRow[] {
  const seen = new Set<string>();
  // محصول تازه‌ای که سطر قبلیِ همین فایل می‌سازد؛ سطرهای بعدی فقط «نوع» آن هستند
  const pendingProducts = new Set<string>();
  return rows.map((r, i) => {
    const line = i + 2; // سطر ۱ سرستون است
    const sku = normalizeSku(r.sku ?? "");
    const out: PlanRow = { line, sku, action: "unchanged", changes: [], errors: [], warnings: [] };
    if (!validSku(sku)) return { ...out, action: "error", errors: [IMPORT_MESSAGES.sku] };
    if (seen.has(sku)) return { ...out, action: "error", errors: [IMPORT_MESSAGES.duplicate] };
    seen.add(sku);

    const nums: Partial<Record<ImportKey, number | null>> = {};
    for (const k of [
      "price",
      "salePrice",
      "wholesale",
      "costPrice",
      "stock",
      "weightGrams",
    ] as const) {
      if (r[k] === undefined) continue;
      const raw = toLatinDigits(r[k]!).trim();
      if (raw === "-" || raw === "—") {
        nums[k] = null; // پاک کردن (برای تخفیفی، عمده، خرید)
        continue;
      }
      const n = parseAmount(raw);
      if (n === null || Number.isNaN(n)) out.errors.push(IMPORT_MESSAGES.number(k));
      else nums[k] = n;
    }
    let active: boolean | undefined;
    if (r.active !== undefined) {
      const b = yesNo(r.active);
      if (b === null) out.errors.push(IMPORT_MESSAGES.active);
      else active = b;
    }
    let attributes: Record<string, string> | undefined;
    if (r.attributes !== undefined) {
      const a = parseAttributes(r.attributes.replace(/[؛;]/g, "\n"));
      if (!a) out.errors.push(IMPORT_MESSAGES.attributes);
      else attributes = a;
    }
    const hasPriceCols = PRICE_KEYS.some((k) => k in nums);
    if (hasPriceCols && !ctx.canPrice) {
      out.warnings.push(IMPORT_MESSAGES.priceIgnored);
      for (const k of PRICE_KEYS) delete nums[k];
    }

    const ex = ctx.variants.get(sku);
    if (ex) {
      const price = nums.price ?? ex.price;
      const sale = "salePrice" in nums ? nums.salePrice! : ex.salePrice;
      if (sale !== null && sale >= price) out.errors.push(IMPORT_MESSAGES.salePrice);
      if (nums.stock !== undefined && nums.stock !== null && nums.stock < ex.reserved)
        out.errors.push(IMPORT_MESSAGES.stockBelowReserved);
      if (out.errors.length) return { ...out, action: "error" };
      const add = (field: ImportKey, from: Change["from"], to: Change["to"]) => {
        if (to !== undefined && JSON.stringify(from) !== JSON.stringify(to))
          out.changes.push({ field, from, to });
      };
      if (nums.price !== undefined && nums.price !== null) add("price", ex.price, nums.price);
      if ("salePrice" in nums) add("salePrice", ex.salePrice, nums.salePrice!);
      if ("wholesale" in nums) add("wholesale", ex.wholesale, nums.wholesale!);
      if ("costPrice" in nums) add("costPrice", ex.costPrice, nums.costPrice!);
      if (nums.stock !== undefined && nums.stock !== null) add("stock", ex.onHand, nums.stock);
      if (nums.weightGrams !== undefined && nums.weightGrams !== null)
        add("weightGrams", ex.weightGrams, nums.weightGrams);
      if (active !== undefined) add("active", ex.isActive, active);
      if (attributes) add("attributes", JSON.stringify(ex.attributes), JSON.stringify(attributes));
      return {
        ...out,
        action: out.changes.length ? "update" : "unchanged",
        data: {
          productSlug: ex.productSlug,
          ...(nums.price != null ? { price: nums.price } : {}),
          ...("salePrice" in nums ? { salePrice: nums.salePrice! } : {}),
          ...("wholesale" in nums ? { wholesale: nums.wholesale! } : {}),
          ...("costPrice" in nums ? { costPrice: nums.costPrice! } : {}),
          ...(nums.stock != null ? { stock: nums.stock } : {}),
          ...(nums.weightGrams != null ? { weightGrams: nums.weightGrams } : {}),
          ...(active !== undefined ? { isActive: active } : {}),
          ...(attributes ? { attributes } : {}),
        },
      };
    }

    // کد تازه
    const slug = normalizeSlug(r.product ?? "");
    if (!slug) out.errors.push(IMPORT_MESSAGES.newNeeds);
    else if (!validSlug(slug)) out.errors.push(IMPORT_MESSAGES.slug);
    const newProduct = !!slug && !ctx.productSlugs.has(slug) && !pendingProducts.has(slug);
    if (newProduct) {
      if (!r.name || !r.category || !r.brand) out.errors.push(IMPORT_MESSAGES.newProductNeeds);
      if (r.category && !ctx.categories.has(normalizeSlug(r.category)))
        out.errors.push(IMPORT_MESSAGES.category);
      if (r.brand && !ctx.brands.has(normalizeSlug(r.brand)))
        out.errors.push(IMPORT_MESSAGES.brand);
    }
    const price = nums.price ?? null;
    const sale = nums.salePrice ?? null;
    if (price !== null && sale !== null && sale >= price)
      out.errors.push(IMPORT_MESSAGES.salePrice);
    if (out.errors.length) return { ...out, action: "error" };
    const priced = price !== null && price > 0;
    if (!priced) out.warnings.push(IMPORT_MESSAGES.newWithoutPrice);
    if (newProduct) pendingProducts.add(slug);
    return {
      ...out,
      action: newProduct ? "create-product" : "create-variant",
      changes: [{ field: "sku", from: null, to: sku }],
      data: {
        productSlug: slug,
        ...(newProduct
          ? {
              name: r.name!.trim(),
              category: normalizeSlug(r.category!),
              brand: normalizeSlug(r.brand!),
            }
          : {}),
        attributes: attributes ?? {},
        price: price ?? 0,
        salePrice: sale,
        wholesale: nums.wholesale ?? null,
        costPrice: nums.costPrice ?? null,
        stock: nums.stock ?? 0,
        weightGrams: nums.weightGrams ?? 0,
        isActive: priced ? (active ?? true) : false,
      },
    };
  });
}

export const summarizePlan = (plan: PlanRow[]) => ({
  update: plan.filter((p) => p.action === "update").length,
  createVariant: plan.filter((p) => p.action === "create-variant").length,
  createProduct: new Set(
    plan.filter((p) => p.action === "create-product").map((p) => p.data!.productSlug),
  ).size,
  unchanged: plan.filter((p) => p.action === "unchanged").length,
  error: plan.filter((p) => p.action === "error").length,
});
