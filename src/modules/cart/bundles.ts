/** بسته‌های ترکیبی («با هم ارزان‌تر»): وقتی همه‌ی کالاهای یک بسته در سبد باشند، درصد تخفیف — منطق خالص */
import type { CartLine } from "./types";

export type BundleRule = { id: string; title: string; percent: number; productIds: string[] };
export type AppliedBundle = { id: string; title: string; times: number; discount: number };

/**
 * هر بسته به تعداد کمترین تعداد کالاهایش اعمال می‌شود؛ هر عدد کالا فقط در یک بسته حساب می‌شود.
 * تخفیف = درصد × جمع قیمت یک عدد از هر کالای بسته، گرد به پایین تا هزار تومان.
 */
export function bundleDiscount(
  lines: Pick<CartLine, "productId" | "unitPrice" | "quantity">[],
  bundles: BundleRule[],
): { total: number; applied: AppliedBundle[] } {
  const qty = new Map<string, number>();
  const price = new Map<string, number>();
  for (const l of lines) {
    qty.set(l.productId, (qty.get(l.productId) ?? 0) + l.quantity);
    const p = price.get(l.productId);
    price.set(l.productId, p === undefined ? l.unitPrice : Math.min(p, l.unitPrice));
  }
  const applied: AppliedBundle[] = [];
  for (const b of bundles) {
    const ids = [...new Set(b.productIds)];
    if (ids.length < 2 || b.percent < 1 || b.percent > 90) continue;
    const times = Math.min(...ids.map((id) => qty.get(id) ?? 0));
    if (times < 1) continue;
    const setPrice = ids.reduce((s, id) => s + (price.get(id) ?? 0), 0);
    const discount = Math.floor((setPrice * b.percent) / 100 / 1000) * 1000 * times;
    if (discount <= 0) continue;
    for (const id of ids) qty.set(id, (qty.get(id) ?? 0) - times);
    applied.push({ id: b.id, title: b.title, times, discount });
  }
  return { total: applied.reduce((s, a) => s + a.discount, 0), applied };
}

/** قیمت بسته برای نمایش: جمع و قیمت پس از تخفیف */
export function bundlePrice(prices: number[], percent: number) {
  const sum = prices.reduce((s, p) => s + p, 0);
  const discount = Math.floor((sum * percent) / 100 / 1000) * 1000;
  return { sum, discount, price: sum - discount };
}
