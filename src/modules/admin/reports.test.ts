import { describe, expect, it } from "vitest";
import { costCoverage, groupSales, ruleUptake } from "./reports";

const lines = [
  { category: "ماشین", brand: "الف", product: "A", quantity: 2, unitPrice: 1000, unitCost: 700 },
  { category: "ماشین", brand: "ب", product: "B", quantity: 1, unitPrice: 2000, unitCost: null },
  { category: "تیغه", brand: "الف", product: "C", quantity: 4, unitPrice: 100, unitCost: 50 },
];

describe("گزارش فروش و سود (FR-ADM-12، D-050)", () => {
  it("گروه‌بندی و سود فقط روی اقلام دارای قیمت خرید", () => {
    const g = groupSales(lines, "category");
    expect(g[0]).toMatchObject({
      key: "ماشین",
      quantity: 3,
      revenue: 4000,
      costedRevenue: 2000,
      cost: 1400,
      profit: 600,
      margin: 30,
    });
    expect(g[1]).toMatchObject({ key: "تیغه", revenue: 400, profit: 200, margin: 50 });
    expect(groupSales(lines, "brand").map((x) => x.key)).toEqual(["الف", "ب"]);
  });
  it("پوشش قیمت خرید", () => expect(costCoverage(lines)).toBe(54.5));
  it("عملکرد قانون پیشنهاد", () =>
    expect(ruleUptake([["A", "C"], ["A"], ["B"]], [{ id: "r", source: "A", target: "C" }])).toEqual(
      [{ id: "r", withSource: 2, withBoth: 1, rate: 50 }],
    ));
});
