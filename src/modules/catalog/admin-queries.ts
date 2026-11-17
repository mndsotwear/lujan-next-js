/** کاتالوگ برای پنل (FR-ADM-01, FR-ADM-03) — فقط سرور */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { availableQty } from "./stock";

export type ProductFilters = {
  q?: string;
  category?: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  stock?: "out" | "low";
};

export async function listProductsAdmin(f: ProductFilters) {
  const where: Prisma.ProductWhereInput = {};
  if (f.q)
    where.OR = [
      { name: { contains: f.q, mode: "insensitive" } },
      { slug: { contains: f.q.toLowerCase() } },
      { variants: { some: { sku: { contains: f.q.toUpperCase() } } } },
    ];
  if (f.category) where.category = { slug: f.category };
  if (f.status) where.status = f.status;
  const rows = await db.product.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 5000, // صفحه‌بندی در صفحه‌ی پنل (فیلتر موجودی بعد از خواندن اعمال می‌شود)
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      updatedAt: true,
      category: { select: { name: true } },
      brand: { select: { name: true } },
      _count: { select: { images: true } },
      // عکس کوچک در فهرست محصولات پنل
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
      variants: {
        select: {
          price: true,
          salePrice: true,
          isActive: true,
          inventory: {
            select: { onHand: true, reserved: true, safetyStock: true, lowStockThreshold: true },
          },
        },
      },
    },
  });
  const withStock = rows.map((p) => {
    const active = p.variants.filter((v) => v.isActive);
    const stock = active.reduce((s, v) => s + (v.inventory ? availableQty(v.inventory) : 0), 0);
    const low = active.some(
      (v) => v.inventory && availableQty(v.inventory) <= v.inventory.lowStockThreshold,
    );
    const prices = active.map((v) => v.salePrice ?? v.price).filter((x) => x > 0);
    return { ...p, stock, low, minPrice: prices.length ? Math.min(...prices) : null };
  });
  return withStock.filter((p) =>
    f.stock === "out" ? p.stock === 0 : f.stock === "low" ? p.low && p.stock > 0 : true,
  );
}

export async function getProductAdmin(id: string) {
  return db.product.findUnique({
    where: { id },
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      variants: {
        orderBy: { createdAt: "asc" },
        include: { inventory: true, priceTiers: { where: { priceLevel: 1, minQty: 1 } } },
      },
    },
  });
}
export type AdminProduct = NonNullable<Awaited<ReturnType<typeof getProductAdmin>>>;

export const listCategoriesAdmin = () =>
  db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });

export const listBrandsAdmin = () =>
  db.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

export const getCategoryAdmin = (id: string) => db.category.findUnique({ where: { id } });

/** پرسش‌ها و نظرهای منتظر برای صندوق ورودی (FR-ADM-08) */
export const pendingQuestions = () =>
  db.question.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      product: { select: { name: true, slug: true } },
      user: { select: { name: true, mobile: true } },
    },
  });

export const pendingReviews = () =>
  db.review.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      product: { select: { name: true, slug: true } },
      user: { select: { name: true, mobile: true } },
    },
  });
