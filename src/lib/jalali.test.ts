import { describe, expect, it } from "vitest";
import { formatJalaliInput, jalaliToGregorian, parseJalali } from "./jalali";

describe("تاریخ شمسی", () => {
  it("تبدیل به میلادی", () => {
    expect(jalaliToGregorian(1405, 1, 1)).toEqual([2026, 3, 21]);
    expect(jalaliToGregorian(1405, 8, 13)).toEqual([2026, 11, 4]);
    expect(jalaliToGregorian(1403, 12, 30)).toEqual([2025, 3, 20]);
  });
  it("خواندن ورودی با ارقام فارسی و شروع/پایان روز به وقت تهران", () => {
    expect(parseJalali("۱۴۰۵/۰۸/۱۳")?.toISOString()).toBe("2026-11-03T20:30:00.000Z");
    expect(parseJalali("1405/8/13", true)?.toISOString()).toBe("2026-11-04T20:29:59.000Z");
    expect(parseJalali("1405/13/01")).toBe(null);
    expect(parseJalali("فردا")).toBe(null);
  });
  it("رفت و برگشت", () => expect(formatJalaliInput(parseJalali("1405/08/13"))).toBe("1405/08/13"));
});
