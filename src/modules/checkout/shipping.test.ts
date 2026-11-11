import { describe, expect, it } from "vitest";
import { chargeableKg, parcelOf, quoteShipping, shippingOptions } from "./shipping";
import { trackingSteps } from "./tracking";

const abadan = { province: "خوزستان", city: "آبادان" };
const ahvaz = { province: "خوزستان", city: "اهواز" };
const tehran = { province: "تهران", city: "تهران" };
const small = parcelOf([{ weightGrams: 400, volumeCm3: 0, quantity: 1 }]); // ۷۰۰ گرم با بسته‌بندی
const avail = (d: Parameters<typeof shippingOptions>[0], p = small) =>
  shippingOptions(d, p)
    .filter((o) => o.available)
    .map((o) => o.method);

describe("parcelOf و chargeableKg (D-029)", () => {
  it("وزن × تعداد + بسته‌بندی؛ سبد خالی صفر", () => {
    expect(parcelOf([{ weightGrams: 900, volumeCm3: 0, quantity: 2 }]).grams).toBe(2100);
    expect(parcelOf([]).grams).toBe(0);
    expect(parcelOf([{ weightGrams: 900, volumeCm3: 0, quantity: 0 }]).grams).toBe(0);
  });
  it("حداقل ۱ کیلو و گرد به بالا", () => {
    expect(chargeableKg({ grams: 0, volumeCm3: 0 })).toBe(1);
    expect(chargeableKg({ grams: 1000, volumeCm3: 0 })).toBe(1);
    expect(chargeableKg({ grams: 1001, volumeCm3: 0 })).toBe(2);
  });
  it("وزن حجمی برای کالای سبک و بزرگ", () => {
    // ۳۰×۲۵×۱۲ = ۹۰۰۰ ÷ ۵۰۰۰ = ۱٫۸ ← ۲ کیلو، با اینکه وزن واقعی ۱٫۲ است
    const p = parcelOf([{ weightGrams: 900, volumeCm3: 30 * 25 * 12, quantity: 1 }]);
    expect(chargeableKg(p)).toBe(2);
  });
});

describe("quoteShipping (D-029)", () => {
  it("بدون آدرس فقط تحویل حضوری", () => expect(avail(null)).toEqual(["PICKUP"]));
  it("پیک فقط آبادان", () => {
    expect(avail(abadan)).toEqual(["PICKUP", "COURIER", "TIPAX", "POST"]);
    expect(avail({ province: "خوزستان", city: "آبادان " })).toContain("COURIER");
    expect(avail(tehran)).toEqual(["PICKUP", "TIPAX", "POST"]);
    expect(quoteShipping("COURIER", tehran, small).reason).toBe("courier_city");
  });
  it("قیمت پایه برای استان دیگر همان D-026", () => {
    expect(quoteShipping("POST", tehran, small).cost).toBe(70_000);
    expect(quoteShipping("TIPAX", tehran, small).cost).toBe(95_000);
    expect(quoteShipping("COURIER", abadan, small).cost).toBe(120_000);
    expect(quoteShipping("PICKUP", null, small).cost).toBe(0);
  });
  it("داخل خوزستان ارزان‌تر", () => {
    expect(quoteShipping("POST", ahvaz, small).cost).toBe(60_000);
    expect(quoteShipping("TIPAX", abadan, small).cost).toBe(80_000);
  });
  it("هر کیلوی اضافه", () => {
    const p3 = { grams: 2500, volumeCm3: 0 }; // ۳ کیلو
    expect(quoteShipping("POST", tehran, p3).cost).toBe(70_000 + 2 * 25_000);
    expect(quoteShipping("TIPAX", tehran, p3).cost).toBe(95_000 + 1 * 20_000);
  });
  it("کالای سنگین: صندلی ۶۵ کیلو فقط تیپاکس و حضوری", () => {
    const chair = parcelOf([{ weightGrams: 65_000, volumeCm3: 80 * 70 * 60, quantity: 1 }]);
    expect(chargeableKg(chair)).toBe(68);
    expect(avail(abadan, chair)).toEqual(["PICKUP", "TIPAX"]);
    expect(quoteShipping("POST", tehran, chair).reason).toBe("too_heavy");
    expect(quoteShipping("TIPAX", tehran, chair).cost).toBe(95_000 + 66 * 20_000);
  });
});

describe("trackingSteps (FR-SHP-05)", () => {
  const states = (s: Parameters<typeof trackingSteps>[0]) =>
    trackingSteps(s)
      .steps.map((x) => x.state[0])
      .join("");
  it("مراحل بر اساس وضعیت", () => {
    expect(states("PENDING_PAYMENT")).toBe("dcttt");
    expect(states("PAID")).toBe("ddctt");
    expect(states("PROCESSING")).toBe("ddctt");
    expect(states("SHIPPED")).toBe("ddddc");
    expect(states("READY_FOR_PICKUP")).toBe("ddddc");
    expect(states("DELIVERED")).toBe("ddddd");
  });
  it("لغو و مرجوعی", () => {
    expect(trackingSteps("CANCELLED").cancelled).toBe(true);
    expect(trackingSteps("RETURNED").returned).toBe(true);
    expect(states("CANCELLED")).toBe("dtttt");
  });
});
