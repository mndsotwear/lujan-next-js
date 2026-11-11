import { describe, expect, it } from "vitest";
import { availableQty, stockState } from "./stock";

describe("stock", () => {
  it("رزرو و ذخیره اطمینان از موجودی کم می‌شود", () => {
    expect(availableQty({ onHand: 10, reserved: 3, safetyStock: 2 })).toBe(5);
    expect(availableQty({ onHand: 2, reserved: 3, safetyStock: 0 })).toBe(0);
  });
  it("موجود / کم‌مانده / ناموجود", () => {
    expect(stockState({ onHand: 20, reserved: 0, safetyStock: 0, lowStockThreshold: 3 })).toBe(
      "in_stock",
    );
    expect(stockState({ onHand: 3, reserved: 0, safetyStock: 0, lowStockThreshold: 3 })).toBe(
      "low",
    );
    expect(stockState({ onHand: 1, reserved: 1, safetyStock: 0, lowStockThreshold: 3 })).toBe(
      "out",
    );
  });
});
