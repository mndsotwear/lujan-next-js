import { describe, expect, it } from "vitest";
import { isValidPostalCode, normalizePostalCode, validateAddress } from "./address";
import { isValidIban, maskIban, normalizeIban } from "./iban";
import { mergeCartItems } from "./merge";
import { formatMobile, maskMobile, normalizeMobile } from "./mobile";
import { canSend, generateCode, hashCode, OTP, verifyCode } from "./otp";

describe("normalizeMobile", () => {
  it("شکل‌های مختلف یک شماره", () => {
    for (const m of [
      "09123456789",
      "۰۹۱۲ ۳۴۵ ۶۷۸۹",
      "+989123456789",
      "00989123456789",
      "9123456789",
      "0912-345-6789",
    ])
      expect(normalizeMobile(m)).toBe("09123456789");
  });
  it("نامعتبر", () => {
    for (const m of ["0812345678", "0912345678", "091234567890", "abc", ""])
      expect(normalizeMobile(m)).toBeNull();
  });
  it("نمایش و پنهان‌سازی", () => {
    expect(formatMobile("09123456789")).toBe("۰۹۱۲ ۳۴۵ ۶۷۸۹");
    expect(maskMobile("09123456789")).toBe("0912***6789");
  });
});

describe("otp", () => {
  const secret = "test-secret";
  it("کد ۵ رقمی و هش قابل تأیید، وابسته به شماره", () => {
    const c = generateCode();
    expect(c).toHaveLength(OTP.length);
    const h = hashCode(c, "09120000000", secret);
    expect(verifyCode(c, "09120000000", h, secret)).toBe(true);
    expect(verifyCode(c, "09120000001", h, secret)).toBe(false);
    expect(
      verifyCode("00000".slice(0, 5) === c ? "11111" : "00000", "09120000000", h, secret),
    ).toBe(false);
  });
  it("محدودیت نرخ ارسال", () => {
    const now = new Date("2026-11-03T12:00:00Z");
    const ago = (s: number) => new Date(now.getTime() - s * 1000);
    expect(canSend([], [], now)).toEqual({ ok: true });
    expect(canSend([ago(20)], [], now)).toEqual({ ok: false, reason: "wait", retryInSec: 40 });
    expect(canSend([ago(61)], [], now)).toEqual({ ok: true });
    expect(canSend([ago(100), ago(500), ago(900), ago(1300), ago(1700)], [], now)).toEqual({
      ok: false,
      reason: "too_many",
    });
    expect(canSend([ago(4000)], [], now)).toEqual({ ok: true });
    expect(
      canSend(
        [],
        Array.from({ length: 15 }, (_, i) => ago(100 + i)),
        now,
      ),
    ).toEqual({ ok: false, reason: "too_many" });
  });
});

describe("mergeCartItems (FR-CART-02)", () => {
  it("شناسه و فیلدهای اضافه‌ی ردیف پایگاه داده کپی نمی‌شوند", () => {
    const row = {
      id: "row1",
      cartId: "c1",
      createdAt: new Date(),
      variantId: "a",
      quantity: 1,
      savedForLater: false,
      priceAtAdd: 100,
    };
    const [m] = mergeCartItems([], [row], 20);
    expect(Object.keys(m!).sort()).toEqual([
      "priceAtAdd",
      "quantity",
      "savedForLater",
      "variantId",
    ]);
  });
  const it_ = (variantId: string, quantity: number, savedForLater = false) => ({
    variantId,
    quantity,
    savedForLater,
    priceAtAdd: 100,
  });
  it("جمع اقلام یکسان با سقف، افزودن اقلام تازه", () => {
    const r = mergeCartItems([it_("a", 2), it_("b", 1)], [it_("a", 19), it_("c", 3)], 20);
    expect(r).toEqual([it_("a", 20), it_("b", 1), it_("c", 3)]);
  });
  it("ذخیره برای بعد", () => {
    expect(mergeCartItems([it_("a", 2, true)], [it_("a", 1)], 20)).toEqual([it_("a", 1)]);
    expect(mergeCartItems([it_("a", 2, true)], [it_("a", 3, true)], 20)).toEqual([
      it_("a", 3, true),
    ]);
  });
});

describe("address", () => {
  it("کد پستی: ۱۰ رقم با ارقام فارسی و خط تیره", () => {
    expect(isValidPostalCode("۱۳۱۸۷-۴۳۹۱۱")).toBe(true);
    expect(normalizePostalCode("۱۳۱۸۷-۴۳۹۱۱")).toBe("1318743911");
    expect(isValidPostalCode("12345")).toBe(false);
    expect(isValidPostalCode("1111111111")).toBe(false);
  });
  it("خطاهای فرم آدرس", () => {
    const ok = {
      province: "تهران",
      city: "تهران",
      postalCode: "1318743911",
      line: "خیابان آزادی، کوچه ۵، پلاک ۱۲",
      recipient: "علی محمدی",
      phone: "09123456789",
    };
    expect(validateAddress(ok)).toEqual({});
    expect(
      Object.keys(
        validateAddress({ ...ok, province: "x", postalCode: "1", line: "کوتاه", phone: "0912" }),
      ).sort(),
    ).toEqual(["line", "phone", "postalCode", "province"]);
    expect(validateAddress({ ...ok, phone: "+98 916 008 7345" }).phone).toBeUndefined();
    expect(validateAddress({ ...ok, phone: "00989160087345" }).phone).toBeUndefined();
    expect(validateAddress({ ...ok, phone: "۰۶۱-۵۳۲۲۱۱۰۰" }).phone).toBeUndefined();
  });
});

describe("شبا (D-041)", () => {
  it("یکدست‌سازی و رقم کنترل", () => {
    expect(normalizeIban("ir05 0170 0000 0012 3456 7890 12")).toBe("IR050170000000123456789012");
    expect(normalizeIban("۰۵۰۱۷۰۰۰۰۰۰۰۱۲۳۴۵۶۷۸۹۰۱۲")).toBe("IR050170000000123456789012");
    expect(isValidIban("IR050170000000123456789012")).toBe(true);
    expect(isValidIban("IR060170000000123456789012")).toBe(false);
    expect(isValidIban("IR05017000000012345678901")).toBe(false);
    expect(maskIban("IR050170000000123456789012")).toBe("IR05 •••• 9012");
  });
});
