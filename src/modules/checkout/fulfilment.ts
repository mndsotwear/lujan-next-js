/**
 * کارهای اپراتور روی سفارش (FR-ADM-04، D-037..D-039) — منطق خالص و تست‌شده.
 */
import { toLatinDigits } from "@/lib/format";
import { canTransition, type OrderStatus, type PaymentMethod } from "./rules";
import type { ShippingMethod } from "./shipping";

/** وضعیت‌هایی که اپراتور می‌تواند سفارش را به آن ببرد (پرداخت آنلاین فقط از درگاه «پرداخت‌شده» می‌شود) */
export function operatorNextStatuses(o: {
  status: OrderStatus;
  shippingMethod: ShippingMethod;
}): OrderStatus[] {
  // «مرجوعی» دستی نیست: وقتی همه‌ی اقلام بازپرداخت شد خودکار ثبت می‌شود (موجودی و بازپرداخت با گردش مرجوعی)
  const options: OrderStatus[] = [
    "PROCESSING",
    "READY_FOR_PICKUP",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ];
  return options.filter((to) => {
    if (!canTransition(o.status, to)) return false;
    if (o.status === "PENDING_PAYMENT" && to !== "CANCELLED") return false;
    if (to === "READY_FOR_PICKUP") return o.shippingMethod === "PICKUP";
    if (to === "SHIPPED") return o.shippingMethod !== "PICKUP";
    return true;
  });
}

/** برای پست و تیپاکس، ارسال بدون کد رهگیری ثبت نمی‌شود */
export const needsTrackingCode = (m: ShippingMethod) => m === "POST" || m === "TIPAX";

/** ارقام فارسی/عربی (کیبورد فارسی) و خط تیره‌های فارسی پذیرفته می‌شوند */
export const normalizeTrackingCode = (code: string) =>
  toLatinDigits(code)
    .trim()
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\s\u200c]+/g, "")
    .toUpperCase()
    .slice(0, 40);

export const validTrackingCode = (code: string) => /^[A-Z0-9\-]{6,40}$/.test(code);

/** با لغو، موجودی چه می‌شود (D-039) */
export function stockOnCancel(o: {
  status: OrderStatus;
  paymentMethod: PaymentMethod;
}): "release_reservation" | "return_to_stock" {
  // پرداخت آنلاین هنوز انجام‌نشده: کالا فقط رزرو بود
  return o.status === "PENDING_PAYMENT" && o.paymentMethod === "ONLINE"
    ? "release_reservation"
    : "return_to_stock";
}

/** مبلغ قابل بازپرداخت = پرداخت‌های موفق − بازپرداخت‌های قبلی (D-038) */
export function refundableAmount(
  payments: { status: string; amount: number }[],
  refunds: { amount: number }[],
): number {
  const paid = payments.filter((p) => p.status === "SUCCESS").reduce((s, p) => s + p.amount, 0);
  return Math.max(0, paid - refunds.reduce((s, r) => s + r.amount, 0));
}

export type RefundError = "amount" | "reference" | "too_much";

export function validateRefund(amount: number, reference: string, max: number): RefundError | null {
  if (!Number.isSafeInteger(amount) || amount <= 0) return "amount";
  if (amount > max) return "too_much";
  if (!/^[A-Za-z0-9\-]{4,40}$/.test(reference.trim())) return "reference";
  return null;
}

/** گذارهای مرجوعی (FR-RET-02) */
export type ReturnStatus =
  "REQUESTED" | "APPROVED" | "REJECTED" | "RECEIVED" | "REFUNDED" | "EXCHANGED";
const RETURN_FLOW: Record<ReturnStatus, ReturnStatus[]> = {
  REQUESTED: ["APPROVED", "REJECTED"],
  APPROVED: ["RECEIVED", "REJECTED"],
  RECEIVED: ["REFUNDED", "EXCHANGED"],
  REJECTED: [],
  REFUNDED: [],
  EXCHANGED: [],
};
export const returnNext = (s: ReturnStatus) => RETURN_FLOW[s];
export const canMoveReturn = (from: ReturnStatus, to: ReturnStatus) =>
  RETURN_FLOW[from].includes(to);

/** بازپرداخت پیش‌فرض مرجوعی: قیمت کالاهای برگشتی */
export const defaultReturnRefund = (items: { unitPrice: number; quantity: number }[]) =>
  items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
