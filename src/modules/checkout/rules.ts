/**
 * قواعد تسویه حساب — منطق خالص (FR-CHK-01..05, 07، FR-SHP-01، FR-INV-05).
 */
import { STORE } from "@/config/store";
import { normalize } from "@/modules/search/normalize";

import type { ShippingMethod } from "./shipping";

export type { ShippingMethod };
export type PaymentMethod = "ONLINE" | "COD";
export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PROCESSING"
  | "READY_FOR_PICKUP"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED";

const sameCity = (city: string | null | undefined) =>
  !!city && normalize(city) === normalize(STORE.storeLocation.city);

/** پرداخت در محل: فقط شهر فروشگاه (پیک یا حضوری) و تا سقف مبلغ (D-024) */
export function codAllowed(
  method: ShippingMethod,
  addressCity: string | null,
  grandTotal: number,
): boolean {
  if (grandTotal > STORE.cod.maxTotal) return false;
  return method === "PICKUP" || (method === "COURIER" && sameCity(addressCity));
}

/** گذارهای مجاز وضعیت سفارش — همین جدول در پنل مدیریت (M1.9) هم استفاده می‌شود */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PAID", "PROCESSING", "CANCELLED"],
  PAID: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["READY_FOR_PICKUP", "SHIPPED", "CANCELLED"],
  READY_FOR_PICKUP: ["DELIVERED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  CANCELLED: [],
  RETURNED: [],
};
export const canTransition = (from: OrderStatus, to: OrderStatus) => TRANSITIONS[from].includes(to);

export function reservationExpired(reservedUntil: Date | null, now = new Date()): boolean {
  return !!reservedUntil && reservedUntil.getTime() <= now.getTime();
}

/** کد تحویل حضوری ۶ رقمی (FR-INV-05) — ورودی تصادفی تزریق می‌شود تا قابل تست باشد */
export function makePickupCode(random: () => number = Math.random): string {
  return String(Math.floor(random() * 900_000) + 100_000);
}
