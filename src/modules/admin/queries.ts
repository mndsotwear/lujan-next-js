/** خواندن داده‌های پنل (فقط سرور) */
import { db } from "@/lib/db";
import { conversionRate, dailySeries, isSale, summarize } from "./metrics";
import { persianMonthStart, tehranDayStart } from "./time";

export async function getDashboard(now = new Date()) {
  const dayStart = tehranDayStart(now);
  const monthStart = persianMonthStart(now);
  const since30 = new Date(dayStart.getTime() - 29 * 86_400_000);
  const from = since30 < monthStart ? since30 : monthStart;
  const rows = await db.order.findMany({
    where: { createdAt: { gte: from } },
    select: { createdAt: true, grandTotal: true, status: true, userId: true },
  });
  const inMonth = rows.filter((r) => r.createdAt >= monthStart);
  const month = summarize(inMonth);

  const items = await db.orderItem.findMany({
    where: { order: { createdAt: { gte: monthStart } } },
    select: {
      quantity: true,
      unitPrice: true,
      order: { select: { status: true } },
      variant: { select: { product: { select: { id: true, name: true } } } },
    },
  });
  const best = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const it of items) {
    if (!isSale(it.order.status)) continue;
    const p = it.variant.product;
    const b = best.get(p.id) ?? { name: p.name, qty: 0, revenue: 0 };
    b.qty += it.quantity;
    b.revenue += it.quantity * it.unitPrice;
    best.set(p.id, b);
  }

  const hourAgo = new Date(now.getTime() - 3_600_000);
  const [cartsThisMonth, abandoned, toProcess, toReview, inventories, toCancel] = await Promise.all(
    [
      // هر کاربر یک سبد ماندگار دارد که بعد از سفارش خالی می‌شود؛ پس «سبد فعال این ماه» = هر سبدی که این ماه تغییر کرده
      db.cart.count({ where: { updatedAt: { gte: monthStart } } }),
      db.cart.findMany({
        where: {
          updatedAt: { lt: hourAgo, gte: new Date(now.getTime() - 30 * 86_400_000) },
          items: { some: { savedForLater: false } },
        },
        select: {
          items: {
            where: { savedForLater: false },
            select: { quantity: true, priceAtAdd: true },
          },
        },
      }),
      db.order.count({ where: { status: { in: ["PAID", "PROCESSING"] } } }),
      db.returnRequest.count({ where: { status: "REQUESTED" } }),
      db.inventory.findMany({
        select: { onHand: true, reserved: true, lowStockThreshold: true },
      }),
      db.order.count({ where: { cancelRequestedAt: { not: null } } }),
    ],
  );

  return {
    today: summarize(rows.filter((r) => r.createdAt >= dayStart)),
    month,
    series: dailySeries(rows, 30, now),
    best: [...best.values()].sort((a, b) => b.qty - a.qty).slice(0, 5),
    conversion: conversionRate(
      new Set(inMonth.filter((r) => isSale(r.status)).map((r) => r.userId)).size,
      cartsThisMonth,
    ),
    abandoned: {
      count: abandoned.length,
      value: abandoned.reduce(
        (s, c) => s + c.items.reduce((t, i) => t + i.quantity * i.priceAtAdd, 0),
        0,
      ),
    },
    todo: {
      toCancel,
      toProcess,
      toReview,
      lowStock: inventories.filter((i) => i.onHand - i.reserved <= i.lowStockThreshold).length,
    },
  };
}
export type Dashboard = Awaited<ReturnType<typeof getDashboard>>;

export async function listStaff() {
  const users = await db.user.findMany({
    where: { role: { not: "CUSTOMER" } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      mobile: true,
      name: true,
      role: true,
      totpEnabledAt: true,
      staffDisabledAt: true,
      lockedUntil: true,
      adminSessions: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
  });
  return users.map(({ adminSessions, ...u }) => ({
    ...u,
    lastLogin: adminSessions[0]?.createdAt ?? null,
  }));
}

export const AUDIT_PAGE = 50;

export async function listAudit(page: number, actionPrefix?: string) {
  const where = actionPrefix ? { action: { startsWith: actionPrefix } } : {};
  const [rows, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * AUDIT_PAGE,
      take: AUDIT_PAGE,
      include: { actor: { select: { mobile: true, name: true } } },
    }),
    db.auditLog.count({ where }),
  ]);
  return { rows, total, pages: Math.max(1, Math.ceil(total / AUDIT_PAGE)) };
}
