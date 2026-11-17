import { describe, expect, it } from "vitest";
import { flavorsIn, inferFlavors, parseTaste, rankByTaste } from "./flavors";

describe("طعم‌یاب", () => {
  it("حدس طعم از نام محصول", () => {
    expect(inferFlavors("نسکافه ۳ در ۱ کارامل لته")).toEqual(["sweet", "caramel", "milky"]);
    expect(inferFlavors("نودل کره ای سامیانگ بولداک ۳ ایکس فوق تند ۱۴۰ گرم")).toContain("spicy");
    expect(inferFlavors("نودل پنیری رامن کره‌ای سامیانگ مدل بولداک ۴ پنیر")).toEqual(
      expect.arrayContaining(["spicy", "cheesy"]),
    );
    expect(inferFlavors("کاپوچینو گوددی رژیمی بدون شکر")).not.toContain("sweet");
    expect(inferFlavors("چای کرک زعفرانی 1000 گرم")).toEqual(["saffron", "spiced"]);
  });
  it("طعم از توضیح فقط با تکرار", () => {
    expect(inferFlavors("قهوه", "با طعم فندق", "")).toEqual([]);
    expect(inferFlavors("قهوه", "با طعم فندق", "عطر فندق دلنشین")).toEqual(["hazelnut"]);
  });
  it("متن آزاد مشتری", () => {
    expect(flavorsIn("یه چیز شیرین و فندقی")).toEqual(["sweet", "hazelnut"]);
    expect(parseTaste({ f: "caramel,evil", q: "خیلی تند" })).toEqual({
      picked: ["caramel"],
      q: "خیلی تند",
      wanted: ["caramel", "spicy"],
    });
  });
  it("رتبه‌بندی", () => {
    const ps = [
      { id: "a", flavors: ["sweet"], stock: "in_stock", soldCount: 9 },
      { id: "b", flavors: ["sweet", "caramel"], stock: "in_stock", soldCount: 1 },
      { id: "c", flavors: ["sweet", "caramel"], stock: "out", soldCount: 50 },
      { id: "d", flavors: ["spicy"], stock: "in_stock", soldCount: 99 },
    ];
    expect(rankByTaste(ps, ["sweet", "caramel"]).map((p) => p.id)).toEqual(["b", "c", "a"]);
    expect(rankByTaste(ps, [])).toEqual([]);
  });
});
