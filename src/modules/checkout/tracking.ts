/**
 * مراحل پیگیری سفارش (FR-SHP-05) — منطق خالص؛ همان برای صفحه‌ی مهمان و حساب کاربری.
 */
import type { OrderStatus } from "./rules";
import type { ShippingMethod } from "./shipping";

export type TrackStepKey = "placed" | "confirmed" | "processing" | "handover" | "delivered";
export type TrackStep = { key: TrackStepKey; state: "done" | "current" | "todo" };
export type TrackState = { steps: TrackStep[]; cancelled: boolean; returned: boolean };

const KEYS: TrackStepKey[] = ["placed", "confirmed", "processing", "handover", "delivered"];

/** آخرین مرحله‌ی انجام‌شده برای هر وضعیت */
const DONE_UPTO: Record<OrderStatus, number> = {
  PENDING_PAYMENT: 0,
  PAID: 1,
  PROCESSING: 1, // پرداخت در محل مستقیم «در حال آماده‌سازی» ثبت می‌شود
  READY_FOR_PICKUP: 3,
  SHIPPED: 3,
  DELIVERED: 4,
  RETURNED: 4,
  CANCELLED: 0,
};

export function trackingSteps(status: OrderStatus): TrackState {
  const upto = DONE_UPTO[status];
  const finished = status === "DELIVERED" || status === "RETURNED";
  return {
    cancelled: status === "CANCELLED",
    returned: status === "RETURNED",
    steps: KEYS.map((key, i) => ({
      key,
      state:
        i <= upto
          ? "done"
          : i === upto + 1 && !finished && status !== "CANCELLED"
            ? "current"
            : "todo",
    })),
  };
}

/** برچسب مرحله‌ی «تحویل به حمل» بسته به روش */
export const handoverKind = (m: ShippingMethod) => (m === "PICKUP" ? "pickup" : "ship");
