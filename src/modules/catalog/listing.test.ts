import { describe, expect, it } from "vitest";
import { applyListing, PAGE_SIZE, parseListingParams, toQueryString } from "./listing";
import { SPEC_SCHEMAS } from "./specs";
import type { ProductSummary } from "./types";

const schema = SPEC_SCHEMAS.coffee;
const mk = (o: Partial<ProductSummary> & { slug: string }): ProductSummary => ({
  id: o.slug,
  name: o.slug,
  summary: null,
  icon: "coffee",
  brandName: "",
  brandSlug: "brand-a",
  categorySlug: "instant-coffee",
  tags: [],
  ratingAvg: 4,
  ratingCount: 1,
  soldCount: 0,
  createdAt: new Date(2026, 0, 1),
  specs: {},
  flavors: [],
  price: 1_000_000,
  oldPrice: null,
  stock: "in_stock",
  available: 5,
  defaultVariantId: null,
  variantCount: 1,
  ...o,
});
const products = [
  mk({
    slug: "a",
    soldCount: 10,
    price: 4_000_000,
    specs: { kind: "pure", decaf: true },
  }),
  mk({
    slug: "b",
    soldCount: 50,
    price: 2_000_000,
    specs: { kind: "mix3in1" },
    brandSlug: "brand-b",
  }),
  mk({
    slug: "c",
    soldCount: 99,
    price: 3_000_000,
    specs: { kind: "pure" },
    stock: "out",
    available: 0,
  }),
];
const names = { "brand-a": "الف", "brand-b": "ب" };

describe("parseListingParams", () => {
  it("مقادیر ناشناخته و کلیدهای غیرقابل‌فیلتر را دور می‌ریزد", () => {
    const p = parseListingParams(
      { sort: "hack", kind: "pure,laser", color: "red", page: "-3", instock: "1" },
      schema,
    );
    expect(p.sort).toBe("bestselling");
    expect(p.page).toBe(1);
    expect(p.specs).toEqual({ kind: ["pure"] });
    expect(p.inStock).toBe(true);
    expect(parseListingParams({ min: "3abc", max: "۵۰۰" }, schema).minPrice).toBeNull();
  });
  it("رفت و برگشت به URL", () => {
    const p = parseListingParams(
      { sort: "cheapest", brand: "brand-a", kind: "pure", max: "5000000" },
      schema,
    );
    expect(toQueryString(p)).toBe("?sort=cheapest&brand=brand-a&max=5000000&kind=pure");
    expect(toQueryString(parseListingParams({}, schema))).toBe("");
  });
});

describe("applyListing", () => {
  it("فیلتر طعم (هر کدام از طعم‌ها) و شمارش آن", () => {
    const tasty = [
      mk({ slug: "x", flavors: ["caramel", "sweet"] }),
      mk({ slug: "y", flavors: ["spicy"] }),
      mk({ slug: "z", flavors: [] }),
    ];
    const p = parseListingParams({ taste: "caramel,spicy,evil" }, schema);
    expect(p.specs.taste).toEqual(["caramel", "spicy"]);
    const r = applyListing(tasty, schema, p, names);
    expect(r.items.map((i) => i.slug).sort()).toEqual(["x", "y"]);
    const facet = r.facets.find((f) => f.key === "taste");
    expect(facet?.options.find((o) => o.value === "sweet")?.count).toBe(1);
  });
  it("پرفروش‌ترین، با ناموجود در انتها", () => {
    const r = applyListing(products, schema, parseListingParams({}, schema), names);
    expect(r.items.map((p) => p.slug)).toEqual(["b", "a", "c"]);
  });
  it("فیلتر مشخصات، بله/خیر، برند، قیمت و موجودی", () => {
    const run = (raw: Record<string, string>) =>
      applyListing(products, schema, parseListingParams(raw, schema), names).items.map(
        (p) => p.slug,
      );
    expect(run({ kind: "pure" })).toEqual(["a", "c"]);
    expect(run({ decaf: "1" })).toEqual(["a"]);
    expect(run({ brand: "brand-b" })).toEqual(["b"]);
    expect(run({ max: "3000000", sort: "cheapest" })).toEqual(["b", "c"]);
    expect(run({ instock: "1", kind: "pure" })).toEqual(["a"]);
  });
  it("شمارش گزینه‌ها فیلتر همان گروه را نادیده می‌گیرد", () => {
    const r = applyListing(products, schema, parseListingParams({ kind: "pure" }, schema), names);
    const motor = r.facets.find((f) => f.key === "kind")!;
    expect(motor.options.find((o) => o.value === "mix3in1")?.count).toBe(1);
    expect(motor.options.find((o) => o.value === "pure")?.selected).toBe(true);
    const brand = r.facets.find((f) => f.key === "brand")!;
    expect(brand.options.find((o) => o.value === "brand-b")?.count).toBe(0);
  });
  it("صفحه‌بندی و صفحه‌ی خارج از محدوده", () => {
    const many = Array.from({ length: PAGE_SIZE + 3 }, (_, i) => mk({ slug: `p${i}` }));
    const r = applyListing(many, schema, parseListingParams({ page: "9" }, schema), names);
    expect(r.pages).toBe(2);
    expect(r.page).toBe(2);
    expect(r.items).toHaveLength(3);
  });
});
