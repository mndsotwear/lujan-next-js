import { describe, expect, it } from "vitest";
import { reviveDates } from "@/lib/cache";
import { breadcrumbLd, jsonLdString, metaDescription, productLd } from ".";

describe("سئو", () => {
  it("توضیح متا: اولین متن موجود، بدون قالب، کوتاه‌شده", () => {
    expect(metaDescription(null, "", "## تیتر\n\n**قوی** و سبک")).toBe("تیتر قوی و سبک");
    const long = "کلمه ".repeat(60);
    const d = metaDescription(long)!;
    expect(d.length).toBeLessThanOrEqual(160);
    expect(d.endsWith("…")).toBe(true);
    expect(metaDescription(undefined, null)).toBeUndefined();
  });

  it("JSON-LD نمی‌تواند تگ script را ببندد", () => {
    expect(jsonLdString({ n: "</script><script>alert(1)" })).not.toContain("</script>");
  });

  it("مسیر ناوبری با نشانی کامل و شماره‌ی ترتیب", () => {
    const ld = breadcrumbLd(
      [{ label: "خانه", href: "/" }, { label: "قیچی" }],
      "/categories/scissors",
    );
    expect(ld.itemListElement[1]).toMatchObject({ position: 2, name: "قیچی" });
    expect(ld.itemListElement[1]!.item).toMatch(/\/categories\/scissors$/);
  });

  it("محصول: قیمت به ریال، چند نوع = AggregateOffer، امتیاز فقط با نظر", () => {
    const base = {
      name: "ماشین",
      slug: "m",
      brandName: "ب",
      images: ["/media/products/a.webp"],
      ratingAvg: 4.46,
      ratingCount: 0,
    };
    const one: Record<string, unknown> = productLd({
      ...base,
      variants: [{ sku: "A", price: 100_000, stock: "in_stock" }],
    });
    expect(one.offers).toMatchObject({ price: 1_000_000, priceCurrency: "IRR" });
    expect(one).not.toHaveProperty("aggregateRating");
    const many: Record<string, unknown> = productLd({
      ...base,
      ratingCount: 3,
      variants: [
        { sku: "A", price: 100_000, stock: "in_stock" },
        { sku: "B", price: 150_000, stock: "out" },
      ],
    });
    expect(many.offers).toMatchObject({
      "@type": "AggregateOffer",
      lowPrice: 1_000_000,
      highPrice: 1_500_000,
    });
    expect(many.aggregateRating).toMatchObject({ ratingValue: 4.5, reviewCount: 3 });
  });

  it("کش: تاریخ‌ها پس از بازگشت از کش دوباره Date می‌شوند", () => {
    const r = reviveDates({ items: [{ createdAt: "2026-11-05T10:00:00.000Z", name: "x" }] });
    expect(r.items[0]!.createdAt).toBeInstanceOf(Date);
    expect(r.items[0]!.name).toBe("x");
  });
});
