/** گزارش‌های فروش و سود (FR-ADM-12، D-050) — منطق خالص روی اقلام سفارش */
export type SaleLine = {
  category: string;
  brand: string;
  product: string;
  quantity: number;
  unitPrice: number;
  unitCost: number | null;
};

export type Group = {
  key: string;
  quantity: number;
  revenue: number;
  /** فقط اقلامی که قیمت خرید دارند */
  costedRevenue: number;
  cost: number;
  profit: number;
  margin: number | null; // درصد سود روی فروشِ دارای قیمت خرید
};

export function groupSales(lines: SaleLine[], by: "category" | "brand" | "product"): Group[] {
  const map = new Map<string, Group>();
  for (const l of lines) {
    const key = l[by];
    const g = map.get(key) ?? {
      key,
      quantity: 0,
      revenue: 0,
      costedRevenue: 0,
      cost: 0,
      profit: 0,
      margin: null,
    };
    const rev = l.unitPrice * l.quantity;
    g.quantity += l.quantity;
    g.revenue += rev;
    if (l.unitCost !== null) {
      g.costedRevenue += rev;
      g.cost += l.unitCost * l.quantity;
    }
    map.set(key, g);
  }
  return [...map.values()]
    .map((g) => ({
      ...g,
      profit: g.costedRevenue - g.cost,
      margin:
        g.costedRevenue > 0
          ? Math.round(((g.costedRevenue - g.cost) / g.costedRevenue) * 1000) / 10
          : null,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

/** چند درصد فروش قیمت خرید دارد (اعتبار گزارش سود) */
export function costCoverage(lines: SaleLine[]): number {
  const total = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const costed = lines
    .filter((l) => l.unitCost !== null)
    .reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  return total ? Math.round((costed / total) * 1000) / 10 : 0;
}

/**
 * عملکرد پیشنهاد سبد (تقریبی): از سفارش‌هایی که کالای «مبدأ» قانون را داشتند، چند درصد «مقصد» را هم داشتند.
 * دقیق‌تر (کلیک و افزودن از کارت پیشنهاد) با ابزار رویداد در فاز ۲.
 */
export function ruleUptake(
  orders: string[][], // شناسه‌ی محصولات هر سفارش
  rules: { id: string; source: string; target: string }[],
): { id: string; withSource: number; withBoth: number; rate: number }[] {
  return rules.map((r) => {
    const withSource = orders.filter((o) => o.includes(r.source));
    const withBoth = withSource.filter((o) => o.includes(r.target)).length;
    return {
      id: r.id,
      withSource: withSource.length,
      withBoth,
      rate: withSource.length ? Math.round((withBoth / withSource.length) * 1000) / 10 : 0,
    };
  });
}
