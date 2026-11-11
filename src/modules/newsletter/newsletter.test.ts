import { describe, expect, it } from "vitest";
import { isOptOutText, maskAddress, normalizeEmail, parseContact } from "./rules";

describe("خبرنامه", () => {
  it("تشخیص موبایل یا ایمیل", () => {
    expect(parseContact("۰۹۱۲ ۳۴۵ ۶۷۸۹")).toEqual({ channel: "SMS", address: "09123456789" });
    expect(parseContact("+989123456789")).toEqual({ channel: "SMS", address: "09123456789" });
    expect(parseContact(" Ali@Example.COM ")).toEqual({
      channel: "EMAIL",
      address: "ali@example.com",
    });
    expect(parseContact("12345")).toBeNull();
    expect(parseContact("not@an")).toBeNull();
  });

  it("ایمیل نامعتبر رد می‌شود", () => {
    expect(normalizeEmail("a b@x.com")).toBeNull();
    expect(normalizeEmail("<x>@x.com")).toBeNull();
  });

  it("پیامک لغو: «لغو۱» و گونه‌ها، نه هر متنی", () => {
    for (const t of ["لغو۱", "لغو 1", "لغو", "STOP", " لغو‌۱ "]) expect(isOptOutText(t)).toBe(true);
    for (const t of ["سلام", "لغو سفارش ۱۰۱۴", "1"]) expect(isOptOutText(t)).toBe(false);
  });

  it("پنهان‌سازی نشانی در پنل", () => {
    expect(maskAddress({ channel: "SMS", address: "09123456789" })).toBe("0912***6789");
    expect(maskAddress({ channel: "EMAIL", address: "ali@example.com" })).toBe("al***@example.com");
  });
});
