/** داده‌ی گزارش‌ها (FR-ADM-12) — فقط سرور */
import { db } from "@/lib/db";
import { parseJalali } from "@/lib/jalali";
import { dailySeries, isSale, summarize } from "./metrics";
import { costCoverage, groupSales, ruleUptake, type SaleLine } from "./reports";
import { tehranDayStart } from "./time";

export type Range = { from: Date; to: Date; label: string };

/** ?days=7|30|90 یا ?from=1405/08/01&to=1405/08/30 */
export function parseRange(
  sp: { days?: string; from?: string; to?: string },
  now = new Date(),
): Range {
  const from = sp.from ? parseJalali(sp.from) : null;
  const to = sp.to ? parseJalali(sp.to, true) : null;
  if (from && to && from <= to) return { from, to, label: `${sp.from} — ${sp.to}` };
  const days = ["7", "30", "90"].includes(sp.days ?? "") ? Number(sp.days) : 30;
  return {
    from: new Date(tehranDayStart(now).getTime() - (days - 1) * 86_400_000),
    to: now,
    label: String(days),
  };
}

export async function getReport(r: Range) {
  const orders = await db.order.findMany({
    where: { createdAt: { gte: r.from, lte: r.to } },
    select: {
      createdAt: true,
      grandTotal: true,
      status: true,
      items: {
        select: {
          quantity: true,
          unitPrice: true,
          unitCost: true,
          variant: {
            select: {
              product: {
                select: {
                  id: true,
                  name: true,
                  category: { select: { name: true } },
                  brand: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  const sales = orders.filter((o) => isSale(o.status));
  const lines: SaleLine[] = sales.flatMap((o) =>
    o.items.map((i) => ({
      category: i.variant.product.category.name,
      brand: i.variant.product.brand.name,
      product: i.variant.product.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      unitCost: i.unitCost,
    })),
  );
  const rules = await db.recommendationRule.findMany({
    where: { isActive: true, type: "COMPLEMENT" },
    include: {
      sourceProduct: { select: { name: true } },
      targetProduct: { select: { name: true } },
    },
  });
  const uptake = ruleUptake(
    sales.map((o) => o.items.map((i) => i.variant.product.id)),
    rules.map((x) => ({ id: x.id, source: x.sourceProductId, target: x.targetProductId })),
  );
  const days = Math.min(
    120,
    Math.max(1, Math.ceil((r.to.getTime() - r.from.getTime()) / 86_400_000)),
  );
  const byCategory = groupSales(lines, "category");
  return {
    summary: summarize(orders),
    profit: byCategory.reduce((s, g) => s + g.profit, 0),
    coverage: costCoverage(lines),
    series: dailySeries(orders, days, r.to),
    byCategory,
    byBrand: groupSales(lines, "brand"),
    byProduct: groupSales(lines, "product").slice(0, 20),
    rules: rules
      .map((x) => ({
        source: x.sourceProduct.name,
        target: x.targetProduct.name,
        ...uptake.find((u) => u.id === x.id)!,
      }))
      .sort((a, b) => b.withSource - a.withSource),
  };
}
export type Report = Awaited<ReturnType<typeof getReport>>;
