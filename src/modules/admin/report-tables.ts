/** جدول‌های گزارش برای نمایش و خروجی اکسل/CSV — یک منبع (FR-ADM-12, FR-ADM-13) */
import { fa } from "@/content/fa";
import type { Group } from "./reports";

export const REPORT_TABLES = ["daily", "category", "brand", "product", "rules", "zero"] as const;
export type ReportTable = (typeof REPORT_TABLES)[number];
export type Table = { title: string; headers: string[]; rows: (string | number | null)[][] };

type Input = {
  series: { day: string; revenue: number; orders: number }[];
  byCategory: Group[];
  byBrand: Group[];
  byProduct: Group[];
  rules: { source: string; target: string; withSource: number; withBoth: number; rate: number }[];
  zero: { query: string; count: number }[];
};

/** canCost: ستون‌های سود فقط برای دارنده‌ی مجوز قیمت (D-050) */
export function buildTables(r: Input, canCost: boolean): Record<ReportTable, Table> {
  const t = fa.admin.reports;
  const c = t.col;
  const groupTable = (title: string, groups: Group[]): Table => ({
    title,
    headers: [c.name, c.qty, c.revenue, ...(canCost ? [c.profit, c.margin] : [])],
    rows: groups.map((g) => [
      g.key,
      g.quantity,
      g.revenue,
      ...(canCost
        ? [g.costedRevenue ? g.profit : null, g.margin === null ? null : `${g.margin}%`]
        : []),
    ]),
  });
  return {
    daily: {
      title: t.daily,
      headers: ["تاریخ", c.revenue, fa.admin.reports.orders],
      rows: r.series.map((s) => [
        new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-latn", { dateStyle: "short" }).format(
          new Date(`${s.day}T12:00:00+03:30`),
        ),
        s.revenue,
        s.orders,
      ]),
    },
    category: groupTable(t.byCategory, r.byCategory),
    brand: groupTable(t.byBrand, r.byBrand),
    product: groupTable(t.byProduct, r.byProduct),
    rules: {
      title: t.rules,
      headers: [c.source, c.target, c.withSource, c.withBoth, c.rate],
      rows: r.rules.map((x) => [x.source, x.target, x.withSource, x.withBoth, `${x.rate}%`]),
    },
    zero: {
      title: t.zero,
      headers: [c.query, c.times],
      rows: r.zero.map((z) => [z.query, z.count]),
    },
  };
}
