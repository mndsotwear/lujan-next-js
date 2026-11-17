import { describe, expect, it } from "vitest";
import { emallsItem, paginate, torobItem, type FeedProduct } from "./torob";

const p: FeedProduct = {
  id: "p1",
  slug: "چای-سیلانی",
  name: "چای سیلانی",
  categoryName: "چای",
  brandName: "المنیس",
  summary: "چای ممتاز",
  price: 1_790_000,
  oldPrice: 1_890_000,
  inStock: true,
  images: ["https://lujan.ir/a.webp", "/media/x.jpg"],
  createdAt: new Date("2026-11-01T00:00:00Z"),
  updatedAt: new Date("2026-11-02T00:00:00Z"),
};

describe("خروجی ترب و ایمالز", () => {
  it("قالب ترب", () => {
    const t = torobItem(p, "https://lujan.ir");
    expect(t.page_url).toBe("https://lujan.ir/products/" + encodeURIComponent("چای-سیلانی"));
    expect(t.current_price).toBe(1_790_000);
    expect(t.old_price).toBe(1_890_000);
    expect(t.availability).toBe("instock");
    expect(t.image_links).toEqual(["https://lujan.ir/a.webp", "https://lujan.ir/media/x.jpg"]);
  });
  it("ناموجود: قیمت صفر", () => {
    const t = torobItem({ ...p, inStock: false }, "https://lujan.ir");
    expect(t.availability).toBe("outofstock");
    expect(t.current_price).toBe(0);
    expect(emallsItem({ ...p, inStock: false }, "https://lujan.ir").is_available).toBe(false);
  });
  it("صفحه‌بندی", () => {
    const items = Array.from({ length: 250 }, (_, i) => i);
    expect(paginate(items, "2")).toMatchObject({ page: 2, maxPages: 3, total: 250 });
    expect(paginate(items, "9").page).toBe(3);
    expect(paginate(items, "x").page).toBe(1);
    expect(paginate(items, 3).items).toHaveLength(50);
  });
});
