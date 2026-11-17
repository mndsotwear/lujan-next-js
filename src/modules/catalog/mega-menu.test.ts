import { describe, expect, it } from "vitest";
import { buildMegaMenu } from "./mega-menu";
import { SPEC_SCHEMAS } from "./specs";
import type { ProductSummary } from "./types";

const prod = (o: Partial<ProductSummary>): ProductSummary => ({
  id: o.slug ?? "p",
  slug: "p",
  name: "کالا",
  summary: null,
  icon: "coffee",
  image: null,
  brandName: "برند الف",
  brandSlug: "a",
  categorySlug: "instant-coffee",
  tags: [],
  ratingAvg: 0,
  ratingCount: 0,
  soldCount: 0,
  createdAt: new Date(0),
  specs: {},
  flavors: [],
  price: 1000,
  oldPrice: null,
  stock: "in_stock",
  available: 5,
  defaultVariantId: "v",
  variantCount: 1,
  ...o,
});

const coffees = {
  slug: "instant-coffee",
  name: "قهوه فوری",
  icon: "coffee",
  specSchema: SPEC_SCHEMAS.coffee,
  children: [] as { slug: string; name: string }[],
};

describe("مگامنو (D-067)", () => {
  const products = [
    prod({
      slug: "m1",
      name: "مگنتی",
      specs: { kind: "mix3in1", decaf: true },
      soldCount: 5,
    }),
    prod({
      slug: "r1",
      name: "روتاری",
      specs: { kind: "pure" },
      soldCount: 9,
      brandSlug: "b",
      brandName: "برند ب",
      stock: "out",
    }),
    prod({ slug: "x", categorySlug: "tea" }),
  ];

  it("فقط گزینه‌های فیلتری که کالا دارند، با پیوند فیلتر", () => {
    const [m] = buildMegaMenu([coffees], products, []);
    const motor = m!.groups.find((g) => g.title === "نوع قهوه")!;
    expect(motor.links.map((l) => l.label)).toEqual(["قهوه فوری خالص", "۳ در ۱"]);
    expect(motor.links[0]!.href).toBe("/categories/instant-coffee?kind=pure");
    expect(m!.count).toBe(2);
  });

  it("پیشنهاد = پرفروش‌ترین کالای موجود؛ برندها به ترتیب فروش و بدون تکرار", () => {
    const [m] = buildMegaMenu([coffees], products, [
      { slug: "a", name: "برند الف", logoUrl: "/logo.png" },
    ]);
    expect(m!.featured!.href).toBe("/products/m1");
    expect(m!.brands.map((b) => b.name)).toEqual(["برند ب", "برند الف"]);
    expect(m!.brands[1]!.logoUrl).toBe("/logo.png");
    expect(m!.brands[0]!.href).toBe("/categories/instant-coffee?brand=b");
  });

  it("زیردسته‌ها اول؛ دسته‌ی بدون فیلتر «محبوب‌ها» می‌گیرد", () => {
    const [withKids] = buildMegaMenu(
      [{ ...coffees, children: [{ slug: "cordless", name: "شارژی" }] }],
      products,
      [],
    );
    expect(withKids!.groups[0]!.title).toBe("زیردسته‌ها");
    expect(withKids!.groups[0]!.links[0]!.href).toBe("/categories/cordless");
    const [plain] = buildMegaMenu(
      [{ slug: "tea", name: "چای", icon: "tea", specSchema: [], children: [] }],
      products,
      [],
    );
    expect(plain!.groups).toEqual([
      { title: "محبوب‌ها", links: [{ label: "کالا", href: "/products/x" }] },
    ]);
  });

  it("دسته‌ی خالی: بدون پیشنهاد و برند", () => {
    const [m] = buildMegaMenu(
      [{ slug: "empty", name: "خالی", icon: "tea", specSchema: [], children: [] }],
      products,
      [],
    );
    expect(m!.featured).toBeNull();
    expect(m!.brands).toEqual([]);
    expect(m!.groups).toEqual([]);
  });
});
