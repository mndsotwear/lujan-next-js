/**
 * محاسبه‌ی هزینه‌ی ارسال با وزن، ابعاد، مقصد و روش (FR-SHP-01..03، D-029) — منطق خالص.
 */
import { STORE } from "@/config/store";
import { normalize } from "@/modules/search/normalize";

export type ShippingMethod = "PICKUP" | "COURIER" | "TIPAX" | "POST";
export const SHIPPING_METHODS: ShippingMethod[] = ["PICKUP", "COURIER", "TIPAX", "POST"];

/** یک قلم برای محاسبه‌ی بسته: وزن و ابعاد هر عدد */
export type ParcelItem = {
  weightGrams: number;
  volumeCm3: number; // طول × عرض × ارتفاع؛ ۰ اگر ابعاد ثبت نشده
  quantity: number;
};
export type Parcel = { grams: number; volumeCm3: number };
export type Destination = { province: string; city: string } | null;

export type ShippingQuote = {
  method: ShippingMethod;
  cost: number;
  eta: string;
  available: boolean;
  /** چرا در دسترس نیست */
  reason?: "no_address" | "courier_city" | "too_heavy";
};

const same = (a: string | null | undefined, b: string) => !!a && normalize(a) === normalize(b);

export function parcelOf(items: ParcelItem[]): Parcel {
  const active = items.filter((i) => i.quantity > 0);
  if (!active.length) return { grams: 0, volumeCm3: 0 };
  return {
    grams:
      active.reduce((s, i) => s + Math.max(0, i.weightGrams) * i.quantity, 0) +
      STORE.shipping.packagingGrams,
    volumeCm3: active.reduce((s, i) => s + Math.max(0, i.volumeCm3) * i.quantity, 0),
  };
}

/** وزن قابل‌محاسبه به کیلو: بیشترِ وزن واقعی و وزن حجمی، گرد به بالا، حداقل ۱ */
export function chargeableKg(p: Parcel): number {
  const real = p.grams / 1000;
  const volumetric = p.volumeCm3 / STORE.shipping.volumetricDivisor;
  return Math.max(1, Math.ceil(Math.max(real, volumetric) - 1e-9));
}

export function quoteShipping(
  method: ShippingMethod,
  dest: Destination,
  parcel: Parcel,
): ShippingQuote {
  const cfg = STORE.shipping.methods[method];
  const kg = chargeableKg(parcel);
  const extraKg = Math.max(0, kg - cfg.includedKg);
  const inProvince = same(dest?.province, STORE.storeLocation.province);
  const cost =
    method === "PICKUP"
      ? 0
      : cfg.base + extraKg * cfg.perKg - (inProvince ? cfg.sameProvinceDiscount : 0);
  const quote = { method, cost: Math.max(0, cost), eta: cfg.eta };
  if (method === "PICKUP") return { ...quote, available: true };
  if (!dest) return { ...quote, available: false, reason: "no_address" };
  if (method === "COURIER" && !same(dest.city, STORE.storeLocation.city))
    return { ...quote, available: false, reason: "courier_city" };
  if (cfg.maxKg !== null && kg > cfg.maxKg)
    return { ...quote, available: false, reason: "too_heavy" };
  return { ...quote, available: true };
}

export const shippingOptions = (dest: Destination, parcel: Parcel): ShippingQuote[] =>
  SHIPPING_METHODS.map((m) => quoteShipping(m, dest, parcel));
