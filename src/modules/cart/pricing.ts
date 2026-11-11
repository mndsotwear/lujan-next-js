/** محاسبه‌ی جمع سبد (FR-CART-04، FR-CART-05) — اقلام ذخیره‌شده برای بعد و ناموجود حساب نمی‌شوند. */
import { STORE } from "@/config/store";
import type { CouponResult } from "./coupon";
import type { CartLine, CartTotals } from "./types";

export const countable = (l: CartLine) => !l.savedForLater && l.stock !== "out";

export function computeTotals(
  lines: CartLine[],
  coupon: CouponResult | null,
  threshold: number | null = STORE.freeShippingThreshold,
): CartTotals {
  const active = lines.filter(countable);
  const subtotal = active.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const itemSavings = active.reduce(
    (s, l) => s + (l.oldUnitPrice ? (l.oldUnitPrice - l.unitPrice) * l.quantity : 0),
    0,
  );
  const couponDiscount = coupon?.ok ? Math.min(coupon.discount, subtotal) : 0;
  const total = subtotal - couponDiscount;
  // آستانه‌ی ارسال رایگان روی مبلغ پس از کد تخفیف سنجیده می‌شود؛ بدون آستانه فقط کد FREE_SHIPPING
  const byCoupon = !!(coupon?.ok && coupon.freeShipping);
  const byThreshold = threshold !== null && subtotal > 0 && total >= threshold;
  const freeShipping = byCoupon || byThreshold;
  return {
    itemCount: active.reduce((s, l) => s + l.quantity, 0),
    subtotal,
    itemSavings,
    couponDiscount,
    freeShipping,
    freeShippingGap: freeShipping || threshold === null ? 0 : Math.max(0, threshold - total),
    total,
  };
}
