/** «پیشنهاد شگفت‌انگیز»: تخفیف درصدی زمان‌دار روی محصول — منطق خالص */

export type DealWindow = {
  percent: number;
  startsAt: Date | null;
  endsAt: Date;
  isActive: boolean;
};

/** پیشنهاد فعال همین لحظه (بیشترین درصد اگر چندتا هم‌زمان باشد) */
export function activeDeal<T extends DealWindow>(
  deals: T[] | undefined,
  now = new Date(),
): T | null {
  let best: T | null = null;
  for (const d of deals ?? []) {
    if (!d.isActive || d.endsAt <= now || (d.startsAt && d.startsAt > now)) continue;
    if (d.percent < 1 || d.percent > 90) continue;
    if (!best || d.percent > best.percent) best = d;
  }
  return best;
}

/** قیمت شگفت‌انگیز از قیمت پایه، گرد به پایین تا هزار تومان */
export const dealPrice = (base: number, percent: number) =>
  Math.max(0, Math.floor((base * (100 - percent)) / 100 / 1000) * 1000);

/**
 * قیمت مؤثر یک تنوع: پیشنهاد شگفت‌انگیز (اگر ارزان‌تر است) ← قیمت تخفیفی ← قیمت.
 * oldPrice همیشه قیمت اصلی است تا خط‌خورده نمایش داده شود.
 */
export function effectivePrice(
  v: { price: number; salePrice: number | null },
  deal: { percent: number } | null,
): { price: number; oldPrice: number | null } {
  const base = v.salePrice ?? v.price;
  const flash = deal ? dealPrice(v.price, deal.percent) : null;
  const price = flash !== null && flash < base ? flash : base;
  return { price, oldPrice: price < v.price ? v.price : null };
}

/** زمان باقی‌مانده برای شمارش معکوس */
export function remaining(endsAt: Date, now = new Date()) {
  const ms = Math.max(0, endsAt.getTime() - now.getTime());
  const s = Math.floor(ms / 1000);
  return { done: ms === 0, h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
