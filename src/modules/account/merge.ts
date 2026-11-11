/**
 * ادغام سبد مهمان با سبد حساب پس از ورود (FR-CART-02) — منطق خالص.
 * اقلام یکسان جمع می‌شوند (با سقف)، «ذخیره برای بعد» فقط وقتی هر دو ذخیره‌شده باشند می‌ماند.
 */
export type MergeItem = {
  variantId: string;
  quantity: number;
  savedForLater: boolean;
  priceAtAdd: number;
};

/** فقط همین چهار فیلد را برمی‌گرداند؛ شناسه‌ی ردیف‌ها کپی نمی‌شود (باگ M1.6: تکرار کلید اصلی). */
const pick = (i: MergeItem): MergeItem => ({
  variantId: i.variantId,
  quantity: i.quantity,
  savedForLater: i.savedForLater,
  priceAtAdd: i.priceAtAdd,
});

export function mergeCartItems(
  userItems: MergeItem[],
  guestItems: MergeItem[],
  maxQty: number,
): MergeItem[] {
  const byVariant = new Map(userItems.map((i) => [i.variantId, pick(i)]));
  for (const g of guestItems) {
    const u = byVariant.get(g.variantId);
    if (!u) {
      byVariant.set(g.variantId, { ...pick(g), quantity: Math.min(g.quantity, maxQty) });
      continue;
    }
    const activeQty = (u.savedForLater ? 0 : u.quantity) + (g.savedForLater ? 0 : g.quantity);
    byVariant.set(g.variantId, {
      variantId: g.variantId,
      savedForLater: u.savedForLater && g.savedForLater,
      quantity: Math.min(activeQty || Math.max(u.quantity, g.quantity), maxQty),
      priceAtAdd: g.priceAtAdd, // آخرین قیمتی که مهمان دیده
    });
  }
  return [...byVariant.values()];
}
