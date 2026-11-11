import { describe, expect, it } from "vitest";
import {
  becameAvailable,
  isLowStock,
  lowStockChanges,
  signedDelta,
  validateAdjustment,
} from "./rules";

const inv = (onHand: number, reserved = 0, threshold = 3) => ({
  onHand,
  reserved,
  safetyStock: 0,
  lowStockThreshold: threshold,
});

describe("اصلاح موجودی (FR-INV-03)", () => {
  it("اعتبارسنجی", () => {
    expect(validateAdjustment(5, "PURCHASE", "", inv(2))).toBe(null);
    expect(validateAdjustment(0, "PURCHASE", "", inv(2))).toBe("delta");
    expect(validateAdjustment(1.5, "PURCHASE", "", inv(2))).toBe("delta");
    expect(validateAdjustment(-3, "SALE_STORE", "", inv(4, 2))).toBe("negative");
    expect(validateAdjustment(-2, "SALE_STORE", "", inv(4, 2))).toBe(null);
    expect(validateAdjustment(-1, "DAMAGE", "", inv(4))).toBe("note");
    expect(validateAdjustment(-1, "DAMAGE", "افتاد و شکست", inv(4))).toBe(null);
    expect(validateAdjustment(1, "GIFT", "", inv(4))).toBe("reason");
  });
  it("جهت تغییر بر اساس دلیل", () => {
    expect(signedDelta("PURCHASE", 5)).toBe(5);
    expect(signedDelta("SALE_STORE", 2)).toBe(-2);
    expect(signedDelta("DAMAGE", 1)).toBe(-1);
    expect(signedDelta("ADJUSTMENT", -3)).toBe(-3);
  });
});

describe("کم‌موجودی (FR-INV-04، D-043)", () => {
  it("آستانه بر اساس موجودی قابل‌فروش", () => {
    expect(isLowStock(inv(3))).toBe(true);
    expect(isLowStock(inv(10, 8))).toBe(true);
    expect(isLowStock(inv(4))).toBe(false);
  });
  it("فقط تازه‌ها پیامک می‌گیرند؛ برگشته‌ها پاک می‌شوند", () => {
    const rows = [
      { id: "a", ...inv(1), lowStockNotifiedAt: null },
      { id: "b", ...inv(1), lowStockNotifiedAt: new Date() },
      { id: "c", ...inv(20), lowStockNotifiedAt: new Date() },
      { id: "d", ...inv(20), lowStockNotifiedAt: null },
    ];
    const r = lowStockChanges(rows);
    expect(r.notify.map((x) => x.id)).toEqual(["a"]);
    expect(r.clear).toEqual(["c"]);
  });
  it("موجود شد", () => {
    expect(becameAvailable(inv(0), inv(5))).toBe(true);
    expect(becameAvailable(inv(2, 2), inv(3, 2))).toBe(true);
    expect(becameAvailable(inv(1), inv(5))).toBe(false);
  });
});
