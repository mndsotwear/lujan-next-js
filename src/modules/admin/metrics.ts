/** محاسبه‌های داشبورد (FR-ADM-11) — منطق خالص روی ردیف‌های سفارش */
export type OrderRow = { createdAt: Date; grandTotal: number; status: string };

/** سفارش «فروش» حساب می‌شود اگر پرداخت یا تأیید شده باشد (نه در انتظار پرداخت، لغو یا مرجوع کامل) */
export const isSale = (status: string) =>
  !["PENDING_PAYMENT", "CANCELLED", "RETURNED"].includes(status);

/** کلید روز در منطقه‌ی زمانی تهران: YYYY-MM-DD */
export const tehranDay = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(d);

export function summarize(rows: OrderRow[]) {
  const sales = rows.filter((r) => isSale(r.status));
  const revenue = sales.reduce((s, r) => s + r.grandTotal, 0);
  return {
    revenue,
    orders: sales.length,
    aov: sales.length ? Math.round(revenue / sales.length) : 0,
  };
}

/** فروش روزانه‌ی n روز اخیر (روزهای بدون فروش صفر)، قدیمی به جدید */
export function dailySeries(rows: OrderRow[], days: number, now = new Date()) {
  const map = new Map<string, { revenue: number; orders: number }>();
  for (let i = days - 1; i >= 0; i--)
    map.set(tehranDay(new Date(now.getTime() - i * 86_400_000)), { revenue: 0, orders: 0 });
  for (const r of rows) {
    if (!isSale(r.status)) continue;
    const d = map.get(tehranDay(r.createdAt));
    if (d) {
      d.revenue += r.grandTotal;
      d.orders += 1;
    }
  }
  return [...map].map(([day, v]) => ({ day, ...v }));
}

/** نرخ تبدیل تقریبی: خریداران ÷ سبدهای فعال (تا ابزار تحلیل بازدید در M1.10)؛ هیچ‌وقت بالای ۱۰۰٪ نمی‌رود */
export const conversionRate = (buyers: number, carts: number) =>
  carts > 0 ? Math.min(100, Math.round((buyers / carts) * 1000) / 10) : 0;
