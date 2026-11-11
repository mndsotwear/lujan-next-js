import { describe, expect, it } from "vitest";
import { formatNumber, formatToman, toLatinDigits, toPersianDigits, tomanToRial } from "./format";

describe("formatNumber / formatToman", () => {
  it("ارقام و جداکننده‌ی فارسی", () => {
    expect(formatNumber(4250000)).toBe("۴٬۲۵۰٬۰۰۰");
    expect(formatToman(280000)).toBe("۲۸۰٬۰۰۰ تومان");
    expect(formatToman(0)).toBe("۰ تومان");
  });
  it("مبلغ اعشاری یا منفی رد می‌شود", () => {
    expect(() => formatToman(10.5)).toThrow(RangeError);
    expect(() => formatToman(-1)).toThrow(RangeError);
  });
});

describe("digits", () => {
  it("فارسی و عربی به لاتین", () => {
    expect(toLatinDigits("۰۹۱۲ ۳۴۵ ٦٧٨٩")).toBe("0912 345 6789");
  });
  it("لاتین به فارسی", () => {
    expect(toPersianDigits("کد 12345")).toBe("کد ۱۲۳۴۵");
  });
});

describe("tomanToRial", () => {
  it("ضرب در ۱۰", () => expect(tomanToRial(4250000)).toBe(42500000));
});

describe("formatOrderNumber", () => {
  it("بدون جداکننده", async () => {
    const { formatOrderNumber } = await import("./format");
    expect(formatOrderNumber(1001)).toBe("۱۰۰۱");
  });
});
