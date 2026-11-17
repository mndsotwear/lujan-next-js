/**
 * خواندن کاتالوگ از پایگاه داده — فقط در Server Component و Server Action صدا زده شود.
 * خروجی‌ها به نوع‌های ساده (ProductSummary و ...) تبدیل می‌شوند تا صفحه‌ها به Prisma وابسته نباشند.
 */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SpecSchema, SpecValues } from "./specs";
import { availableQty, stockState, type StockState } from "./stock";
import type { CategoryInfo, ProductSummary } from "./types";
import { buildMegaMenu, type MegaCategory } from "./mega-menu";
import { activeDeal, effectivePrice } from "./deals";

const summaryInclude = {
  brand: true,
  category: { select: { slug: true, icon: true } },
  variants: { where: { isActive: true }, include: { inventory: true } },
  images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true, alt: true } },
  // پیشنهاد شگفت‌انگیز؛ بازه‌ی زمانی در کد سنجیده می‌شود (activeDeal)
  flashDeals: {
    where: { isActive: true },
    select: { percent: true, startsAt: true, endsAt: true, isActive: true },
  },
} satisfies Prisma.ProductInclude;

type ProductWithSummary = Prisma.ProductGetPayload<{ include: typeof summaryInclude }>;

const STOCK_RANK: Record<StockState, number> = { in_stock: 2, low: 1, out: 0 };

export function variantView(
  v: ProductWithSummary["variants"][number],
  deal: { percent: number } | null = null,
) {
  const inv = v.inventory ?? { onHand: 0, reserved: 0, safetyStock: 0, lowStockThreshold: 3 };
  const { price, oldPrice } = effectivePrice(v, deal);
  return {
    id: v.id,
    sku: v.sku,
    attributes: (v.attributes ?? {}) as Record<string, string>,
    price,
    oldPrice,
    stock: stockState(inv),
    available: availableQty(inv),
  };
}
export type VariantView = ReturnType<typeof variantView>;

function toSummary(p: ProductWithSummary): ProductSummary {
  const deal = activeDeal(p.flashDeals);
  const variants = p.variants.map((v) => variantView(v, deal));
  // قیمت نمایشی: ارزان‌ترین تنوع موجود؛ اگر هیچ‌کدام موجود نیست، ارزان‌ترین تنوع
  const pool = variants.some((v) => v.stock !== "out")
    ? variants.filter((v) => v.stock !== "out")
    : variants;
  const cheapest = pool.reduce<VariantView | null>(
    (m, v) => (!m || v.price < m.price ? v : m),
    null,
  );
  const best = variants.reduce<StockState>(
    (s, v) => (STOCK_RANK[v.stock] > STOCK_RANK[s] ? v.stock : s),
    "out",
  );
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    summary: p.summary,
    icon: p.category.icon ?? "coffee",
    image: p.images[0] ?? null,
    brandName: p.brand.name,
    brandSlug: p.brand.slug,
    categorySlug: p.category.slug,
    tags: p.tags,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    soldCount: p.soldCount,
    createdAt: p.createdAt,
    specs: (p.specs ?? {}) as SpecValues,
    flavors: p.flavors ?? [],
    price: cheapest?.price ?? 0,
    oldPrice: cheapest?.oldPrice ?? null,
    stock: best,
    available: variants.reduce((s, v) => s + v.available, 0),
    defaultVariantId: cheapest?.id ?? null,
    variantCount: variants.length,
  };
}

const toCategory = (c: {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  imageUrl?: string | null;
  specSchema: Prisma.JsonValue;
}): CategoryInfo => ({
  id: c.id,
  slug: c.slug,
  name: c.name,
  icon: c.icon ?? "coffee",
  imageUrl: c.imageUrl ?? null,
  specSchema: (c.specSchema ?? []) as unknown as SpecSchema,
});

/** دسته‌ها برای منو (خام؛ نسخه‌ی کش‌شده و امن در server.ts) */
export async function getNavCategories(): Promise<(CategoryInfo & { productCount: number })[]> {
  const cats = await db.category.findMany({
    where: { parentId: null },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: { where: { status: "PUBLISHED" } } } } },
  });
  return cats.map((c) => ({ ...toCategory(c), productCount: c._count.products }));
}

export async function getCategoryWithProducts(slug: string) {
  const category = await db.category.findUnique({ where: { slug } });
  if (!category) return null;
  const products = await db.product.findMany({
    where: { categoryId: category.id, status: "PUBLISHED" },
    include: summaryInclude,
  });
  return { category: toCategory(category), products: products.map(toSummary) };
}

/** داده‌ی مگامنو (D-067): دسته‌های اصلی با زیردسته، فیلترها، برندها و پیشنهاد هر دسته */
export async function getMegaMenu(): Promise<MegaCategory[]> {
  const [cats, products, brands] = await Promise.all([
    db.category.findMany({
      where: { parentId: null },
      orderBy: { sortOrder: "asc" },
      include: { children: { orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } } },
    }),
    db.product.findMany({
      where: { status: "PUBLISHED" },
      include: summaryInclude,
      orderBy: { soldCount: "desc" },
      take: 2000,
    }),
    db.brand.findMany({ select: { slug: true, name: true, logoUrl: true } }),
  ]);
  return buildMegaMenu(
    cats.map((c) => ({ ...toCategory(c), children: c.children })),
    products.map(toSummary),
    brands,
  );
}

/** پرفروش‌های موجود؛ با categorySlug فقط همان دسته. */
export async function getBestsellers(limit = 4, categorySlug?: string): Promise<ProductSummary[]> {
  const products = await db.product.findMany({
    where: { status: "PUBLISHED", ...(categorySlug ? { category: { slug: categorySlug } } : {}) },
    include: summaryInclude,
    orderBy: { soldCount: "desc" },
    take: limit * 3,
  });
  return products
    .map(toSummary)
    .filter((p) => p.stock !== "out")
    .slice(0, limit);
}

/** جدیدترین کالاهای منتشرشده (ریل «تازه‌ها» در صفحه‌ی اصلی) */
export async function getNewest(limit = 8): Promise<ProductSummary[]> {
  const products = await db.product.findMany({
    where: { status: "PUBLISHED" },
    include: summaryInclude,
    orderBy: { createdAt: "desc" },
    take: limit * 3,
  });
  return products
    .map(toSummary)
    .filter((p) => p.stock !== "out")
    .slice(0, limit);
}

/** کالاهای تخفیف‌دار، بیشترین درصد تخفیف اول (ریل «تخفیف‌های ویژه») */
export async function getDiscounted(limit = 8): Promise<ProductSummary[]> {
  const products = await db.product.findMany({
    where: { status: "PUBLISHED" },
    include: summaryInclude,
    take: 200,
  });
  const off = (p: ProductSummary) => (p.oldPrice ? (p.oldPrice - p.price) / p.oldPrice : 0);
  return products
    .map(toSummary)
    .filter((p) => p.stock !== "out" && p.oldPrice !== null && p.oldPrice > p.price)
    .sort((a, b) => off(b) - off(a))
    .slice(0, limit);
}

export async function getProductPage(slug: string) {
  const p = await db.product.findUnique({
    where: { slug },
    include: {
      ...summaryInclude,
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      reviews: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { user: { select: { name: true } } },
      },
      questions: {
        where: { status: "APPROVED", answer: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      rulesFrom: {
        where: { isActive: true, type: "COMPLEMENT" },
        orderBy: { priority: "desc" },
        include: { targetProduct: { include: summaryInclude } },
      },
    },
  });
  if (!p || p.status !== "PUBLISHED") return null;

  // محصولات مرتبط (FR-CAT-08): اول مکمل‌های تعریف‌شده‌ی مدیر، بعد هم‌دسته‌های پرفروش
  const complements = p.rulesFrom
    .filter((r) => r.targetProduct.status === "PUBLISHED")
    .map((r) => ({ ...toSummary(r.targetProduct), reason: r.reasonLabel }));
  const sameCategory = await db.product.findMany({
    where: { categoryId: p.categoryId, status: "PUBLISHED", id: { not: p.id } },
    include: summaryInclude,
    orderBy: { soldCount: "desc" },
    take: 4,
  });

  return {
    product: {
      ...toSummary({ ...p, category: { slug: p.category.slug, icon: p.category.icon } }),
      description: p.description,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      warrantyMonths: p.warrantyMonths,
      warrantyNote: p.warrantyNote,
      images: p.images.map((i) => ({ url: i.url, alt: i.alt })),
    },
    category: toCategory(p.category),
    variants: p.variants.map((v) => variantView(v, activeDeal(p.flashDeals))),
    reviews: p.reviews.map((r) => ({
      id: r.id,
      name: r.user.name,
      rating: r.rating,
      body: r.body,
      verified: r.isVerified,
      createdAt: r.createdAt,
    })),
    questions: p.questions.map((q) => ({ id: q.id, body: q.body, answer: q.answer ?? "" })),
    complements: complements.filter((c) => c.stock !== "out").slice(0, 4),
    related: sameCategory.map(toSummary),
  };
}
export type ProductPageData = NonNullable<Awaited<ReturnType<typeof getProductPage>>>;

/** اسناد جستجو: نام، برند، دسته، خلاصه و برچسب مشخصات (M1.4). */
export async function getSearchDocuments() {
  const products = await db.product.findMany({
    where: { status: "PUBLISHED" },
    include: {
      ...summaryInclude,
      category: { select: { slug: true, icon: true, name: true, specSchema: true } },
    },
  });
  return products.map((p) => {
    const s = toSummary({ ...p, category: { slug: p.category.slug, icon: p.category.icon } });
    const schema = (p.category.specSchema ?? []) as unknown as SpecSchema;
    const specText = schema
      .map((f) => {
        const v = s.specs[f.key];
        if (v === undefined || v === false) return "";
        if (f.type === "boolean") return f.label;
        if (f.type === "enum") return f.options.find((o) => o.value === v)?.label ?? "";
        return String(v);
      })
      .join(" ");
    return {
      id: p.id,
      name: p.name,
      brand: p.brand.name,
      category: p.category.name,
      extra: [
        p.summary ?? "",
        specText,
        p.tags.join(" "),
        p.variants.map((v) => v.sku).join(" "),
      ].join(" "),
      popularity: p.soldCount,
      inStock: s.stock !== "out",
    };
  });
}

/** خلاصه‌ی محصولات به همان ترتیب شناسه‌های داده‌شده (نتیجه‌ی جستجو). */
export async function getProductSummaries(ids: string[]): Promise<ProductSummary[]> {
  if (!ids.length) return [];
  const products = await db.product.findMany({
    where: { id: { in: ids }, status: "PUBLISHED" },
    include: summaryInclude,
  });
  const byId = new Map(products.map((p) => [p.id, toSummary(p)]));
  return ids.map((id) => byId.get(id)).filter((p): p is ProductSummary => !!p);
}

/** علاقه‌مندی‌های کاربر، جدیدترین اول؛ محصولات غیرمنتشر حذف می‌شوند */
export async function getWishlist(userId: string): Promise<ProductSummary[]> {
  const rows = await db.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { productId: true },
  });
  return getProductSummaries(rows.map((r) => r.productId));
}

export const wishlistCount = (userId: string) => db.wishlistItem.count({ where: { userId } });

/** همه‌ی محصولات منتشرشده برای خروجی ترب و ایمالز */
export async function getFeedProducts() {
  const rows = await db.product.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { updatedAt: "desc" },
    include: {
      ...summaryInclude,
      category: { select: { slug: true, icon: true, name: true } },
      images: { orderBy: { sortOrder: "asc" }, take: 5, select: { url: true, alt: true } },
    },
  });
  return rows.map((p) => {
    const s = toSummary(p);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      categoryName: p.category.name,
      brandName: p.brand.name,
      summary: p.summary,
      price: s.price,
      oldPrice: s.oldPrice,
      inStock: s.stock !== "out" && s.price > 0,
      images: p.images.map((i) => i.url),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  });
}

/** همه‌ی محصولات منتشرشده برای طعم‌یاب (تعداد کم است؛ رتبه‌بندی در کد) */
export async function getTasteProducts(): Promise<ProductSummary[]> {
  const rows = await db.product.findMany({
    where: { status: "PUBLISHED" },
    include: summaryInclude,
  });
  return rows.map(toSummary);
}
