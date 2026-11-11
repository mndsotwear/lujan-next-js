/** اعتبارسنجی کد تخفیف (FR-CART-04) — خالص و قابل تست. */
import { toLatinDigits } from "@/lib/format";
import type { CouponInfo } from "./types";

export type CouponResult =
  | { ok: true; discount: number; freeShipping: boolean }
  | {
      ok: false;
      reason: "inactive" | "not_started" | "expired" | "used_up" | "min_subtotal" | "per_customer";
    };

/** customerUses: سفارش‌های لغونشده‌ی همین مشتری با این کد (D-047) */
export function evaluateCoupon(
  c: CouponInfo,
  subtotal: number,
  now = new Date(),
  customerUses = 0,
): CouponResult {
  if (!c.isActive) return { ok: false, reason: "inactive" };
  if (c.startsAt && now < c.startsAt) return { ok: false, reason: "not_started" };
  if (c.endsAt && now > c.endsAt) return { ok: false, reason: "expired" };
  if (c.usageLimit !== null && c.usedCount >= c.usageLimit) return { ok: false, reason: "used_up" };
  if (c.perCustomerLimit != null && customerUses >= c.perCustomerLimit)
    return { ok: false, reason: "per_customer" };
  if (subtotal < c.minSubtotal) return { ok: false, reason: "min_subtotal" };
  if (c.type === "FREE_SHIPPING") return { ok: true, discount: 0, freeShipping: true };
  let d = c.type === "PERCENT" ? Math.floor((subtotal * c.value) / 100) : c.value;
  if (c.maxDiscount !== null) d = Math.min(d, c.maxDiscount);
  // گرد کردن به هزار تومان پایین‌تر و نه بیشتر از جمع
  d = Math.min(subtotal, Math.floor(d / 1000) * 1000);
  return { ok: true, discount: d, freeShipping: false };
}

/** «SALON۱۰» با کیبورد فارسی همان SALON10 است */
export const normalizeCode = (code: string) =>
  toLatinDigits(code)
    .trim()
    .toUpperCase()
    .replace(/[\s\u200c]+/g, "");

export type CouponForm = {
  code: string;
  type: string;
  value: number | null;
  minSubtotal: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
};
export type CouponFormError =
  "code" | "type" | "value" | "percent" | "maxDiscount" | "limits" | "dates";

/** فرم کد تخفیف در پنل (FR-ADM-06، D-047) */
export function validateCouponForm(c: CouponForm): CouponFormError | null {
  if (!/^[A-Z0-9]{3,20}$/.test(c.code)) return "code";
  if (!["PERCENT", "FIXED", "FREE_SHIPPING"].includes(c.type)) return "type";
  if (
    c.type !== "FREE_SHIPPING" &&
    (c.value === null || !Number.isSafeInteger(c.value) || c.value <= 0)
  )
    return "value";
  if (c.type === "PERCENT" && (c.value ?? 0) > 100) return "percent";
  if (c.maxDiscount !== null && (c.type !== "PERCENT" || c.maxDiscount <= 0)) return "maxDiscount";
  for (const n of [c.minSubtotal, c.usageLimit, c.perCustomerLimit])
    if (n !== null && (!Number.isSafeInteger(n) || n < 0)) return "limits";
  if (c.startsAt && c.endsAt && c.endsAt <= c.startsAt) return "dates";
  return null;
}
