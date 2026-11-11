import { describe, expect, it } from "vitest";
import { open, seal } from "./box";
import { afterFailure, isLocked } from "./lockout";
import { conversionRate, dailySeries, summarize } from "./metrics";
import { hashPassword, passwordProblems, verifyPassword } from "./password";
import { can } from "./permissions";
import { consumeRecoveryCode, generateRecoveryCodes, hashRecovery } from "./recovery";
import { readToken, signToken } from "./signed";
import { persianMonthStart, tehranDayStart } from "./time";
import { base32Decode, base32Encode, hotp, otpauthUri, verifyTotp } from "./totp";

const SECRET = "test-secret-0123456789-0123456789-abcdef";

describe("رمز (NFR-SEC-04)", () => {
  it("هش و بررسی", () => {
    const h = hashPassword("یک جمله‌ی بلند و امن ۱۴۰۵");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("یک جمله‌ی بلند و امن ۱۴۰۵", h)).toBe(true);
    expect(verifyPassword("یک جمله‌ی بلند و امن ۱۴۰۶", h)).toBe(false);
    expect(verifyPassword("x", null)).toBe(false);
    expect(hashPassword("abc") === hashPassword("abc")).toBe(false); // نمک تصادفی
  });
  it("رمز ضعیف", () => {
    expect(passwordProblems("short1", "09120000000")).toContain("short");
    expect(passwordProblems("aaaaaaaaaaaaaa", "09120000000")).toContain("weak");
    expect(passwordProblems("MyPassword2026!", "09120000000")).toContain("common");
    expect(passwordProblems("x09121234567yz!", "09121234567")).toContain("mobile");
    expect(passwordProblems("قیچی سبز روی میز ۷", "09121234567")).toEqual([]);
  });
});

describe("TOTP (RFC 6238)", () => {
  // کلید آزمون RFC: "12345678901234567890"
  const rfc = base32Encode(Buffer.from("12345678901234567890"));
  it("base32 رفت و برگشت", () => {
    expect(rfc).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    expect(base32Decode(rfc).toString()).toBe("12345678901234567890");
  });
  it("بردارهای آزمون RFC (۶ رقم آخر)", () => {
    expect(hotp(rfc, Math.floor(59 / 30))).toBe("287082");
    expect(hotp(rfc, Math.floor(1111111109 / 30))).toBe("081804");
    expect(hotp(rfc, Math.floor(1234567890 / 30))).toBe("005924");
  });
  it("تحمل ±۱ بازه و رد کد تکراری", () => {
    const now = 1_111_111_109_000;
    const c = Math.floor(now / 30_000);
    expect(verifyTotp(rfc, hotp(rfc, c), now)).toBe(c);
    expect(verifyTotp(rfc, hotp(rfc, c - 1), now)).toBe(c - 1);
    expect(verifyTotp(rfc, hotp(rfc, c - 2), now)).toBe(null);
    expect(verifyTotp(rfc, hotp(rfc, c), now, c)).toBe(null); // همان کد دوباره
    expect(verifyTotp(rfc, "12345", now)).toBe(null);
  });
  it("نشانی QR", () => expect(otpauthUri("فروشگاه", "0912", "ABC")).toContain("otpauth://totp/"));
});

describe("رمزنگاری کلید TOTP (NFR-SEC-06)", () => {
  it("باز کردن با کلید درست، شکست با کلید یا داده‌ی دست‌خورده", () => {
    const s = seal("JBSWY3DPEHPK3PXP", SECRET);
    expect(s.includes("JBSWY3DP")).toBe(false);
    expect(open(s, SECRET)).toBe("JBSWY3DPEHPK3PXP");
    expect(open(s, SECRET + "x")).toBe(null);
    expect(open(s.slice(0, -4) + "AAAA", SECRET)).toBe(null);
  });
});

describe("کدهای پشتیبان", () => {
  it("هر کد یک بار", () => {
    const codes = generateRecoveryCodes();
    expect(codes.length).toBe(8);
    expect(new Set(codes).size).toBe(8);
    const hashes = codes.map((c) => hashRecovery(c, SECRET));
    const left = consumeRecoveryCode(codes[0]!.toUpperCase().replace("-", " "), hashes, SECRET);
    expect(left?.length).toBe(7);
    expect(consumeRecoveryCode(codes[0]!, left!, SECRET)).toBe(null);
  });
});

describe("توکن امضاشده", () => {
  it("امضا، انقضا و دست‌کاری", () => {
    const tok = signToken({ uid: "u1", exp: 2000 }, SECRET);
    expect(readToken<{ uid: string; exp: number }>(tok, SECRET, 1000)?.uid).toBe("u1");
    expect(readToken(tok, SECRET, 3000)).toBe(null);
    expect(readToken(tok, "other-secret", 1000)).toBe(null);
    const [, sig] = tok.split(".");
    const forged = Buffer.from(JSON.stringify({ uid: "admin", exp: 2000 })).toString("base64url");
    expect(readToken(`${forged}.${sig}`, SECRET, 1000)).toBe(null);
  });
});

describe("قفل ورود", () => {
  it("پنجمین شکست ۱۵ دقیقه قفل می‌کند", () => {
    const now = new Date("2026-11-04T10:00:00Z");
    expect(afterFailure(3, now)).toEqual({ failedLogins: 4, lockedUntil: null });
    const l = afterFailure(4, now);
    expect(l.lockedUntil?.getTime()).toBe(now.getTime() + 15 * 60_000);
    expect(isLocked(l.lockedUntil, now)).toBe(true);
    expect(isLocked(l.lockedUntil, new Date(now.getTime() + 15 * 60_000 + 1))).toBe(false);
  });
});

describe("مجوزها (FR-ADM-10)", () => {
  it("نقش‌ها", () => {
    expect(can("ADMIN", "staff.manage")).toBe(true);
    expect(can("OPERATOR", "orders.manage")).toBe(true);
    expect(can("OPERATOR", "staff.manage")).toBe(false);
    expect(can("ADMIN", "orders.cancel")).toBe(true);
    expect(can("OPERATOR", "orders.cancel")).toBe(false);
    expect(can("WAREHOUSE", "orders.cancel")).toBe(false);
    expect(can("ADMIN", "products.price")).toBe(true);
    expect(can("CONTENT_MANAGER", "products.price")).toBe(false);
    expect(can("CONTENT_MANAGER", "products.manage")).toBe(true);
    expect(can("WAREHOUSE", "inventory.manage")).toBe(true);
    expect(can("WAREHOUSE", "customers.manage")).toBe(false);
    expect(can("CONTENT_MANAGER", "products.manage")).toBe(true);
    expect(can("CONTENT_MANAGER", "orders.view")).toBe(false);
    expect(can("CUSTOMER", "dashboard.view")).toBe(false);
  });
});

describe("داشبورد (FR-ADM-11)", () => {
  const now = new Date("2026-11-04T08:00:00Z"); // ۱۱:۳۰ تهران
  const rows = [
    { createdAt: new Date("2026-11-04T05:00:00Z"), grandTotal: 1000, status: "PAID" },
    { createdAt: new Date("2026-11-04T06:00:00Z"), grandTotal: 3000, status: "PROCESSING" },
    { createdAt: new Date("2026-11-04T06:30:00Z"), grandTotal: 9999, status: "PENDING_PAYMENT" },
    { createdAt: new Date("2026-11-03T21:00:00Z"), grandTotal: 500, status: "DELIVERED" }, // ۰۰:۳۰ چهارم به وقت تهران
    { createdAt: new Date("2026-11-03T20:00:00Z"), grandTotal: 700, status: "DELIVERED" }, // ۲۳:۳۰ سوم
  ];
  it("جمع، تعداد و میانگین فقط فروش‌های واقعی", () =>
    expect(summarize(rows)).toEqual({ revenue: 5200, orders: 4, aov: 1300 }));
  it("روز بر اساس ساعت تهران", () => {
    const s = dailySeries(rows, 2, now);
    expect(s).toEqual([
      { day: "2026-11-03", revenue: 700, orders: 1 },
      { day: "2026-11-04", revenue: 4500, orders: 3 },
    ]);
  });
  it("شروع روز و ماه شمسی", () => {
    expect(tehranDayStart(now).toISOString()).toBe("2026-11-03T20:30:00.000Z");
    const m = persianMonthStart(now);
    expect(m.getTime() <= tehranDayStart(now).getTime()).toBe(true);
    const d = new Intl.DateTimeFormat("en-u-ca-persian-nu-latn", {
      day: "numeric",
      timeZone: "Asia/Tehran",
    }).format(m);
    expect(d).toBe("1");
  });
  it("نرخ تبدیل", () => {
    expect(conversionRate(3, 40)).toBe(7.5);
    expect(conversionRate(3, 0)).toBe(0);
    expect(conversionRate(9, 3)).toBe(100);
  });
});
