/** مشتریان برای پنل (FR-ADM-05) — فقط سرور */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { toLatinDigits } from "@/lib/format";

const SALE = { notIn: ["PENDING_PAYMENT", "CANCELLED"] as ("PENDING_PAYMENT" | "CANCELLED")[] };

export async function listCustomers(q?: string, type?: "B2C" | "B2B") {
  const where: Prisma.UserWhereInput = { role: "CUSTOMER" };
  if (type) where.customerType = type;
  if (q) {
    const digits = toLatinDigits(q).replace(/\D/g, "");
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { organization: { name: { contains: q, mode: "insensitive" } } },
      ...(digits.length >= 3 ? [{ mobile: { contains: digits } }] : []),
    ];
  }
  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5000, // صفحه‌بندی در صفحه‌ی پنل
    select: {
      id: true,
      name: true,
      mobile: true,
      customerType: true,
      createdAt: true,
      deletedAt: true,
      organization: { select: { name: true, priceLevel: true } },
    },
  });
  const stats = await db.order.groupBy({
    by: ["userId"],
    where: { userId: { in: users.map((u) => u.id) }, status: SALE },
    _sum: { grandTotal: true },
    _count: { _all: true },
    _max: { createdAt: true },
  });
  const byUser = new Map(stats.map((s) => [s.userId, s]));
  return users.map((u) => {
    const s = byUser.get(u.id);
    return {
      ...u,
      orders: s?._count._all ?? 0,
      spent: s?._sum.grandTotal ?? 0,
      lastOrder: s?._max.createdAt ?? null,
    };
  });
}

export async function getCustomerAdmin(id: string) {
  const u = await db.user.findFirst({
    where: { id, role: "CUSTOMER" },
    include: {
      organization: true,
      addresses: { orderBy: { isDefault: "desc" } },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { number: true, status: true, grandTotal: true, createdAt: true },
      },
    },
  });
  if (!u) return null;
  const spent = u.orders
    .filter((o) => o.status !== "PENDING_PAYMENT" && o.status !== "CANCELLED")
    .reduce((s, o) => s + o.grandTotal, 0);
  return { ...u, spent };
}
export type AdminCustomer = NonNullable<Awaited<ReturnType<typeof getCustomerAdmin>>>;
