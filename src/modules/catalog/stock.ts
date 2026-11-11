/** وضعیت موجودی برای نمایش (FR-CAT-04) — قابل‌فروش = فیزیکی − رزرو − ذخیره اطمینان (بخش ۹). */
export type StockState = "in_stock" | "low" | "out";

export function availableQty(inv: {
  onHand: number;
  reserved: number;
  safetyStock: number;
}): number {
  return Math.max(0, inv.onHand - inv.reserved - inv.safetyStock);
}

export function stockState(inv: {
  onHand: number;
  reserved: number;
  safetyStock: number;
  lowStockThreshold: number;
}): StockState {
  const q = availableQty(inv);
  if (q === 0) return "out";
  return q <= inv.lowStockThreshold ? "low" : "in_stock";
}
