import { describe, expect, it } from "vitest";
import { landingIsLive, pageParam, parseIds, parseTags, readingMinutes } from "./blog-rules";

describe("بلاگ و صفحه‌ی فرود", () => {
  it("برچسب‌ها: ویرگول فارسی و لاتین، بدون تکرار، حداکثر ۸", () => {
    expect(parseTags("ماشین اصلاح، روتاری, روتاری ,  ,مگنتی")).toEqual([
      "ماشین اصلاح",
      "روتاری",
      "مگنتی",
    ]);
    expect(parseTags(Array.from({ length: 12 }, (_, i) => `ب${i}`).join("،"))).toHaveLength(8);
  });

  it("شناسه‌ی محصول: فقط قالب درست، بدون تکرار، به ترتیب", () => {
    expect(parseIds(["cmw2abc123def", "<script>", "cmw2abc123def", "cmx9zzz111yyy"])).toEqual([
      "cmw2abc123def",
      "cmx9zzz111yyy",
    ]);
  });

  it("زمان خواندن: حداقل ۱ دقیقه، ۲۰۰ کلمه در دقیقه", () => {
    expect(readingMinutes("یک دو سه")).toBe(1);
    expect(readingMinutes("کلمه ".repeat(1000))).toBe(5);
  });

  it("صفحه‌ی فرود فقط فعال و داخل بازه", () => {
    const now = new Date("2026-11-07T10:00:00Z");
    const day = 86_400_000;
    expect(landingIsLive({ isActive: true, startsAt: null, endsAt: null }, now)).toBe(true);
    expect(landingIsLive({ isActive: false, startsAt: null, endsAt: null }, now)).toBe(false);
    expect(
      landingIsLive({ isActive: true, startsAt: new Date(+now + day), endsAt: null }, now),
    ).toBe(false);
    expect(
      landingIsLive({ isActive: true, startsAt: null, endsAt: new Date(+now - day) }, now),
    ).toBe(false);
  });

  it("شماره‌ی صفحه: ارقام فارسی پذیرفته، نامعتبر = ۱", () => {
    expect(pageParam("۳")).toBe(3);
    expect(pageParam("-2")).toBe(1);
    expect(pageParam("abc")).toBe(1);
    expect(pageParam(undefined)).toBe(1);
  });
});
