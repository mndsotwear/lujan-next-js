import { describe, expect, it } from "vitest";
import { bundleDiscount, bundlePrice } from "./bundles";

const line = (productId: string, unitPrice: number, quantity = 1) => ({
  productId,
  unitPrice,
  quantity,
});
const coffeeSyrup = {
  id: "b1",
  title: "قهوه + سیروپ",
  percent: 10,
  productIds: ["coffee", "syrup"],
};

describe("بسته‌ی ترکیبی", () => {
  it("بدون همه‌ی کالاها تخفیفی نیست", () => {
    expect(bundleDiscount([line("coffee", 1_000_000)], [coffeeSyrup]).total).toBe(0);
  });
  it("یک بار و چند بار", () => {
    expect(
      bundleDiscount([line("coffee", 1_000_000), line("syrup", 500_000)], [coffeeSyrup]).total,
    ).toBe(150_000);
    expect(
      bundleDiscount([line("coffee", 1_000_000, 3), line("syrup", 500_000, 2)], [coffeeSyrup]),
    ).toEqual({
      total: 300_000,
      applied: [{ id: "b1", title: "قهوه + سیروپ", times: 2, discount: 300_000 }],
    });
  });
  it("هر عدد کالا فقط در یک بسته", () => {
    const coffeeTea = { id: "b2", title: "قهوه + چای", percent: 10, productIds: ["coffee", "tea"] };
    const r = bundleDiscount(
      [line("coffee", 1_000_000), line("syrup", 500_000), line("tea", 500_000)],
      [coffeeSyrup, coffeeTea],
    );
    expect(r.applied.map((a) => a.id)).toEqual(["b1"]);
  });
  it("قیمت نمایشی بسته", () => {
    expect(bundlePrice([1_000_000, 555_000], 10)).toEqual({
      sum: 1_555_000,
      discount: 155_000,
      price: 1_400_000,
    });
  });
});
