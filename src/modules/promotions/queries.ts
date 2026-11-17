/** پیشنهاد شگفت‌انگیز و بسته‌های ترکیبی — فقط سرور */
import { db } from "@/lib/db";
import { getProductSummaries } from "@/modules/catalog/server";
import type { BundleRule } from "@/modules/cart/bundles";

export const listDealsAdmin = () =>
  db.flashDeal.findMany({
    orderBy: [{ endsAt: "desc" }],
    include: { product: { select: { name: true, slug: true } } },
    take: 200,
  });

export const listBundlesAdmin = () =>
  db.bundle.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });

/** محصولات با پیشنهاد شگفت‌انگیزِ همین لحظه و نزدیک‌ترین زمان پایان */
export async function getFlashDeals() {
  try {
    const now = new Date();
    const deals = await db.flashDeal.findMany({
      where: {
        isActive: true,
        endsAt: { gt: now },
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      },
      orderBy: { endsAt: "asc" },
      select: { productId: true, endsAt: true },
    });
    if (!deals.length) return { products: [], endsAt: null as string | null };
    const ids = [...new Set(deals.map((d) => d.productId))];
    const products = (await getProductSummaries(ids)).filter((p) => p.stock !== "out");
    return { products, endsAt: products.length ? deals[0]!.endsAt.toISOString() : null };
  } catch {
    return { products: [], endsAt: null as string | null };
  }
}

/** زمان پایان پیشنهاد فعال یک محصول (برای شمارش معکوس صفحه‌ی محصول) */
export async function dealEndFor(productId: string): Promise<string | null> {
  const now = new Date();
  const d = await db.flashDeal
    .findFirst({
      where: {
        productId,
        isActive: true,
        endsAt: { gt: now },
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      },
      orderBy: { percent: "desc" },
      select: { endsAt: true },
    })
    .catch(() => null);
  return d ? d.endsAt.toISOString() : null;
}

/** قانون‌های بسته برای محاسبه‌ی سبد */
export async function activeBundleRules(): Promise<BundleRule[]> {
  try {
    const rows = await db.bundle.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return rows.map((b) => ({
      id: b.id,
      title: b.title,
      percent: b.percent,
      productIds: b.productIds,
    }));
  } catch {
    return [];
  }
}

/** بسته‌ها با خلاصه‌ی محصولات؛ اگر productId بدهید فقط بسته‌های شامل آن محصول */
export async function getBundleViews(productId?: string) {
  const rules = (await activeBundleRules()).filter(
    (b) => !productId || b.productIds.includes(productId),
  );
  if (!rules.length) return [];
  const all = await getProductSummaries([...new Set(rules.flatMap((b) => b.productIds))]);
  const byId = new Map(all.map((p) => [p.id, p]));
  return rules.flatMap((b) => {
    const products = b.productIds
      .map((id) => byId.get(id))
      .filter((p): p is NonNullable<typeof p> => !!p);
    // بسته‌ای که محصولی از آن منتشر نیست، نمایش داده نمی‌شود
    return products.length === b.productIds.length && products.length >= 2
      ? [{ id: b.id, title: b.title, percent: b.percent, products }]
      : [];
  });
}
