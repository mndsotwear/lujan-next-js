import { describe, expect, it } from "vitest";
import { activeDeal, dealPrice, effectivePrice, remaining } from "./deals";

const now = new Date("2026-11-12T12:00:00Z");
const d = (
  o: Partial<{ percent: number; startsAt: Date | null; endsAt: Date; isActive: boolean }>,
) => ({
  percent: 10,
  startsAt: null,
  endsAt: new Date("2026-11-13T00:00:00Z"),
  isActive: true,
  ...o,
});

describe("پیشنهاد شگفت‌انگیز", () => {
  it("فقط پیشنهاد فعال در بازه؛ بیشترین درصد", () => {
    expect(activeDeal([], now)).toBeNull();
    expect(activeDeal([d({ isActive: false })], now)).toBeNull();
    expect(activeDeal([d({ endsAt: new Date("2026-11-12T11:00:00Z") })], now)).toBeNull();
    expect(activeDeal([d({ startsAt: new Date("2026-11-12T13:00:00Z") })], now)).toBeNull();
    expect(activeDeal([d({ percent: 10 }), d({ percent: 25 })], now)?.percent).toBe(25);
  });
  it("قیمت شگفت‌انگیز گرد به هزار تومان", () => {
    expect(dealPrice(1_560_000, 20)).toBe(1_248_000);
    expect(dealPrice(999_999, 10)).toBe(899_000);
  });
  it("قیمت مؤثر: ارزان‌ترینِ شگفت‌انگیز و تخفیفی", () => {
    expect(effectivePrice({ price: 1_000_000, salePrice: null }, null)).toEqual({
      price: 1_000_000,
      oldPrice: null,
    });
    expect(effectivePrice({ price: 1_000_000, salePrice: 900_000 }, null)).toEqual({
      price: 900_000,
      oldPrice: 1_000_000,
    });
    expect(effectivePrice({ price: 1_000_000, salePrice: 900_000 }, { percent: 20 })).toEqual({
      price: 800_000,
      oldPrice: 1_000_000,
    });
    // تخفیف عادی بیشتر از شگفت‌انگیز است: همان می‌ماند
    expect(effectivePrice({ price: 1_000_000, salePrice: 700_000 }, { percent: 20 })).toEqual({
      price: 700_000,
      oldPrice: 1_000_000,
    });
  });
  it("زمان باقی‌مانده", () => {
    expect(remaining(new Date("2026-11-12T13:02:03Z"), now)).toEqual({
      done: false,
      h: 1,
      m: 2,
      s: 3,
    });
    expect(remaining(new Date("2026-11-12T11:00:00Z"), now).done).toBe(true);
  });
});
