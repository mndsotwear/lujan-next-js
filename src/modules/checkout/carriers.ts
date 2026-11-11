/**
 * رابط شرکت‌های حمل (FR-SHP-04، D-032).
 * فعلاً همه «دستی» هستند: اپراتور کد رهگیری را در پنل (M1.9) وارد می‌کند.
 * برای اتصال API پست یا تیپاکس، یک Adapter با همین رابط بسازید و در getCarrier برگردانید.
 */
import { STORE } from "@/config/store";
import type { ShippingMethod } from "./shipping";

export type TrackingEvent = { at: Date; label: string };
export type CreateShipmentInput = {
  orderNumber: number;
  weightGrams: number;
  recipient: string;
  phone: string;
  province: string;
  city: string;
  postalCode: string;
  line: string;
};

export interface CarrierAdapter {
  readonly name: string;
  /** ثبت بار و گرفتن کد رهگیری؛ null یعنی ثبت دستی */
  createShipment(input: CreateShipmentInput): Promise<{ trackingCode: string } | null>;
  /** رویدادهای رهگیری؛ null یعنی این شرکت رهگیری آنلاین ندارد */
  track(trackingCode: string): Promise<TrackingEvent[] | null>;
}

const manual: CarrierAdapter = {
  name: "manual",
  createShipment: async () => null,
  track: async () => null,
};

export function getCarrier(method: ShippingMethod): CarrierAdapter {
  void method; // هر روش Adapter خودش را می‌گیرد وقتی API آماده شد
  return manual;
}

/** صفحه‌ی رهگیری شرکت حمل (اگر داشته باشد) */
export const carrierTrackingPage = (method: ShippingMethod): string | null =>
  STORE.carrierTrackingPages[method] ?? null;
