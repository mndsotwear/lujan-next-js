import { describe, expect, it } from "vitest";
import { evaluateCoupon, normalizeCode } from "./coupon";
import { computeTotals } from "./pricing";
import { pickRecommendations, type Candidate, type RuleRow } from "./recommend";
import type { CartLine, CouponInfo } from "./types";

const line = (o: Partial<CartLine>): CartLine => ({
  id: "l",
  variantId: "v",
  productId: "p",
  slug: "s",
  name: "n",
  variantLabel: null,
  icon: "coffee",
  unitPrice: 1_000_000,
  oldUnitPrice: null,
  priceAtAdd: 1_000_000,
  quantity: 1,
  available: 10,
  stock: "in_stock",
  savedForLater: false,
  weightGrams: 500,
  volumeCm3: 0,
  ...o,
});
const coupon = (o: Partial<CouponInfo>): CouponInfo => ({
  code: "X",
  type: "PERCENT",
  value: 10,
  minSubtotal: 0,
  maxDiscount: null,
  usageLimit: null,
  usedCount: 0,
  startsAt: null,
  endsAt: null,
  isActive: true,
  ...o,
});

describe("evaluateCoupon", () => {
  it("درصدی با سقف و گرد کردن به هزار", () => {
    expect(evaluateCoupon(coupon({ value: 10 }), 4_255_500)).toEqual({
      ok: true,
      discount: 425_000,
      freeShipping: false,
    });
    expect(evaluateCoupon(coupon({ value: 10, maxDiscount: 300_000 }), 4_250_000)).toMatchObject({
      discount: 300_000,
    });
  });
  it("مبلغ ثابت بیشتر از جمع نمی‌شود", () => {
    expect(evaluateCoupon(coupon({ type: "FIXED", value: 900_000 }), 500_000)).toMatchObject({
      discount: 500_000,
    });
  });
  it("دلیل رد", () => {
    const now = new Date("2026-11-03");
    expect(evaluateCoupon(coupon({ isActive: false }), 1)).toEqual({
      ok: false,
      reason: "inactive",
    });
    expect(evaluateCoupon(coupon({ endsAt: new Date("2026-01-01") }), 1, now)).toEqual({
      ok: false,
      reason: "expired",
    });
    expect(evaluateCoupon(coupon({ startsAt: new Date("2027-01-01") }), 1, now)).toEqual({
      ok: false,
      reason: "not_started",
    });
    expect(evaluateCoupon(coupon({ usageLimit: 5, usedCount: 5 }), 1)).toEqual({
      ok: false,
      reason: "used_up",
    });
    expect(evaluateCoupon(coupon({ minSubtotal: 1_000_000 }), 999_000)).toEqual({
      ok: false,
      reason: "min_subtotal",
    });
  });
  it("یکسان‌سازی کد", () => {
    expect(normalizeCode(" salon 10 ")).toBe("SALON10");
    expect(normalizeCode("salon۱۰")).toBe("SALON10");
  });
});

describe("computeTotals", () => {
  it("جمع، سود تخفیف، و حذف ذخیره‌شده و ناموجود", () => {
    const t = computeTotals(
      [
        line({ unitPrice: 4_250_000, oldUnitPrice: 4_900_000 }),
        line({ quantity: 2, unitPrice: 280_000 }),
        line({ savedForLater: true }),
        line({ stock: "out" }),
      ],
      null,
      5_000_000,
    );
    expect(t.subtotal).toBe(4_810_000);
    expect(t.itemSavings).toBe(650_000);
    expect(t.itemCount).toBe(3);
    expect(t.freeShipping).toBe(false);
    expect(t.freeShippingGap).toBe(190_000);
  });
  it("ارسال رایگان پس از کد تخفیف سنجیده می‌شود", () => {
    const lines = [line({ unitPrice: 5_200_000 })];
    expect(computeTotals(lines, null, 5_000_000).freeShipping).toBe(true);
    expect(
      computeTotals(lines, { ok: true, discount: 520_000, freeShipping: false }, 5_000_000),
    ).toMatchObject({ freeShipping: false, freeShippingGap: 320_000, total: 4_680_000 });
    expect(
      computeTotals(lines, { ok: true, discount: 0, freeShipping: true }, 9_000_000).freeShipping,
    ).toBe(true);
  });
  it("سبد خالی ارسال رایگان ندارد", () =>
    expect(computeTotals([], null, 5_000_000).freeShipping).toBe(false));
  it("بدون آستانه (D-018): فقط کد FREE_SHIPPING ارسال را رایگان می‌کند", () => {
    const lines = [line({ unitPrice: 50_000_000 })];
    expect(computeTotals(lines, null, null)).toMatchObject({
      freeShipping: false,
      freeShippingGap: 0,
    });
    expect(
      computeTotals(lines, { ok: true, discount: 0, freeShipping: true }, null).freeShipping,
    ).toBe(true);
  });
});

describe("pickRecommendations", () => {
  const cand = (id: string, price: number, inStock = true): Candidate => ({
    productId: id,
    slug: id,
    name: id,
    icon: "olive",
    variantId: `v-${id}`,
    price,
    inStock,
  });
  const candidates = new Map([
    ["oil", cand("oil", 280_000)],
    ["blade", cand("blade", 950_000)],
    ["comb", cand("comb", 420_000)],
    ["cape", cand("cape", 390_000, false)],
    ["spray", cand("spray", 450_000)],
    ["apron", cand("apron", 890_000)],
  ]);
  const rule = (
    t: string,
    p: number,
    type: RuleRow["type"] = "COMPLEMENT",
    src = "clip",
  ): RuleRow => ({
    sourceProductId: src,
    targetProductId: t,
    type,
    priority: p,
    reasonLabel: `r-${t}`,
  });
  const rules = [
    rule("oil", 100),
    rule("blade", 99),
    rule("comb", 98),
    rule("cape", 97),
    rule("spray", 96),
    rule("apron", 95),
    rule("spray", 0, "EXCLUDE"),
  ];
  const base = { rules, candidates, max: 4, defaultReason: "مکمل" };

  it("ترتیب اولویت، فقط موجود، بدون استثناها، حداکثر ۴", () => {
    const r = pickRecommendations({ ...base, cartProductIds: ["clip"], freeShippingGap: 0 });
    expect(r.map((x) => x.productId)).toEqual(["oil", "blade", "comb", "apron"]);
    expect(r[0]?.reason).toBe("r-oil");
  });
  it("کالای داخل سبد پیشنهاد نمی‌شود", () => {
    const r = pickRecommendations({ ...base, cartProductIds: ["clip", "oil"], freeShippingGap: 0 });
    expect(r.map((x) => x.productId)).not.toContain("oil");
  });
  it("پیشنهاد پله‌ای ارسال رایگان اول می‌آید", () => {
    const r = pickRecommendations({ ...base, cartProductIds: ["clip"], freeShippingGap: 800_000 });
    expect(r[0]).toMatchObject({ productId: "apron", unlocksFreeShipping: true });
    expect(r.find((x) => x.productId === "blade")?.unlocksFreeShipping).toBe(true);
  });
});

describe("محدودیت هر مشتری (D-047)", () => {
  const c = coupon({ perCustomerLimit: 1 });
  it("بار اول مجاز، بار دوم نه", () => {
    expect(evaluateCoupon(c, 2_000_000, new Date(), 0).ok).toBe(true);
    expect(evaluateCoupon(c, 2_000_000, new Date(), 1)).toEqual({
      ok: false,
      reason: "per_customer",
    });
  });
  it("null یعنی بدون محدودیت", () =>
    expect(evaluateCoupon(coupon({ perCustomerLimit: null }), 2_000_000, new Date(), 9).ok).toBe(
      true,
    ));
});
