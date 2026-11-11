import { describe, expect, it } from "vitest";
import {
  IMPORT_COLUMNS,
  mapHeaders,
  planImport,
  summarizePlan,
  toRawRows,
  type ExistingVariant,
} from "./import-rules";

const ex: ExistingVariant = {
  sku: "CL-800-BK",
  productSlug: "nescafe-gold-200",
  price: 4_900_000,
  salePrice: 4_250_000,
  wholesale: 4_312_000,
  costPrice: null,
  onHand: 14,
  reserved: 2,
  weightGrams: 900,
  isActive: true,
  attributes: { color: "مشکی مات" },
};
const ctx = (canPrice = true) => ({
  variants: new Map([[ex.sku, ex]]),
  productSlugs: new Set(["nescafe-gold-200"]),
  categories: new Set(["instant-coffee"]),
  brands: new Set(["brand-a"]),
  canPrice,
});
const header = IMPORT_COLUMNS.map(([, l]) => l);

describe("ورود اکسل (FR-ADM-02)", () => {
  it("سرستون فارسی یا انگلیسی", () => {
    expect(mapHeaders(["کد کالا (SKU)", "price", "ناشناخته"])).toEqual(["sku", "price", null]);
    expect(toRawRows([["نام"], ["x"]]).missingSku).toBe(true);
  });
  it("خانه‌ی خالی تغییر نمی‌دهد؛ فقط تفاوت‌ها", () => {
    const { rows } = toRawRows([
      ["کد کالا (SKU)", "قیمت", "قیمت خرید", "موجودی فیزیکی"],
      ["cl-800-bk", "۵٬۰۰۰٬۰۰۰", "3800000", ""],
    ]);
    const [p] = planImport(rows, ctx());
    expect(p!.action).toBe("update");
    expect(p!.changes).toEqual([
      { field: "price", from: 4_900_000, to: 5_000_000 },
      { field: "costPrice", from: null, to: 3_800_000 },
    ]);
  });
  it("بدون تغییر و خطاها", () => {
    const plan = planImport(
      [
        { sku: "CL-800-BK", price: "4900000" },
        { sku: "CL-800-BK" },
        { sku: "!!" },
        { sku: "NEW-1" },
      ],
      ctx(),
    );
    expect(plan.map((p) => p.action)).toEqual(["unchanged", "error", "error", "error"]);
  });
  it("موجودی کمتر از رزرو و تخفیفی بیشتر از قیمت رد می‌شود", () => {
    const [a, b] = planImport(
      [
        { sku: "CL-800-BK", stock: "1" },
        { sku: "x-2", product: "nescafe-gold-200", price: "100", salePrice: "200" },
      ],
      ctx(),
    );
    expect(a!.action).toBe("error");
    expect(b!.action).toBe("error");
  });
  it("کاربر بدون مجوز قیمت: ستون قیمت نادیده با هشدار (D-042)", () => {
    const [p] = planImport([{ sku: "CL-800-BK", price: "1", weightGrams: "950" }], ctx(false));
    expect(p!.warnings.length).toBe(1);
    expect(p!.changes).toEqual([{ field: "weightGrams", from: 900, to: 950 }]);
  });
  it("نوع و محصول تازه", () => {
    const plan = planImport(
      [
        {
          sku: "CL-800-GD",
          product: "nescafe-gold-200",
          attributes: "color: طلایی",
          price: "5200000",
        },
        {
          sku: "TR-NEW",
          product: "trimmer-new",
          name: "خط‌زن تازه",
          category: "instant-coffee",
          brand: "brand-a",
        },
        { sku: "TR-NEW-2", product: "trimmer-new", price: "900000" },
        { sku: "TR-BAD", product: "trimmer-bad", name: "x", category: "nope", brand: "brand-a" },
      ],
      ctx(),
    );
    expect(plan.map((p) => p.action)).toEqual([
      "create-variant",
      "create-product",
      "create-variant",
      "error",
    ]);
    expect(plan[1]!.data!.isActive).toBe(false); // بدون قیمت
    expect(summarizePlan(plan)).toMatchObject({ createVariant: 2, createProduct: 1, error: 1 });
  });
  it("«-» یعنی پاک کردن تخفیف", () => {
    const [p] = planImport([{ sku: "CL-800-BK", salePrice: "-" }], ctx());
    expect(p!.changes).toEqual([{ field: "salePrice", from: 4_250_000, to: null }]);
  });
  it("همه‌ی سرستون‌های الگو شناخته می‌شوند", () =>
    expect(mapHeaders(header).every((k) => k !== null)).toBe(true));
});
