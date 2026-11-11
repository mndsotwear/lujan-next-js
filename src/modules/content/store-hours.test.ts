import { describe, expect, it } from "vitest";
import { isOpenAt, mapLinks, tehranNow } from "./store-hours";

describe("ساعات فروشگاه (FR-INV-06)", () => {
  it("روز و ساعت تهران", () => {
    // ۱۴۰۵/۰۸/۱۷ = یکشنبه ۸ نوامبر ۲۰۲۶؛ ۰۷:۰۰ UTC = ۱۰:۳۰ تهران
    expect(tehranNow(new Date("2026-11-08T07:00:00Z"))).toEqual({ day: 1, minutes: 630 });
  });

  it("باز یا بسته", () => {
    const hours = [
      { days: [0, 1, 2, 3, 4], open: "09:00", close: "21:00" },
      { days: [5], open: "09:00", close: "13:00" },
    ];
    expect(isOpenAt(hours, { day: 1, minutes: 630 })).toBe(true);
    expect(isOpenAt(hours, { day: 5, minutes: 14 * 60 })).toBe(false);
    expect(isOpenAt(hours, { day: 6, minutes: 630 })).toBe(false);
    expect(isOpenAt(hours, { day: 0, minutes: 21 * 60 })).toBe(false);
  });

  it("پیوند مسیریابی", () => {
    const l = mapLinks({ lat: 30.34, lng: 48.28 });
    expect(l.neshan).toContain("30.34,48.28");
    expect(l.balad).toContain("latitude=30.34");
  });
});
