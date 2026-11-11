/** فهرست و جزئیات سفارش برای پنل (FR-ADM-04) — فقط سرور */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { toLatinDigits } from "@/lib/format";
import type { OrderStatus, PaymentMethod } from "./rules";
import type { ShippingMethod } from "./shipping";

export const ADMIN_ORDERS_PAGE = 30;

export type OrderFilters = {
  q?: string;
  status?: OrderStatus;
  method?: ShippingMethod;
  pay?: PaymentMethod;
  days?: number;
  page: number;
};

const STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "READY_FOR_PICKUP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
];
const METHODS = ["PICKUP", "COURIER", "TIPAX", "POST"];

/** پارامترهای نشانی را امن می‌خواند (مقدار ناشناخته نادیده گرفته می‌شود) */
export function parseOrderFilters(sp: Record<string, string | undefined>): OrderFilters {
  const page = /^\d{1,5}$/.test(sp.page ?? "") ? Math.max(1, Number(sp.page)) : 1;
  const days = ["1", "7", "30"].includes(sp.days ?? "") ? Number(sp.days) : undefined;
  return {
    q: sp.q?.trim().slice(0, 60) || undefined,
    status: STATUSES.includes(sp.status ?? "") ? (sp.status as OrderStatus) : undefined,
    method: METHODS.includes(sp.method ?? "") ? (sp.method as ShippingMethod) : undefined,
    pay: sp.pay === "ONLINE" || sp.pay === "COD" ? sp.pay : undefined,
    days,
    page,
  };
}

export async function listOrdersAdmin(f: OrderFilters) {
  const where: Prisma.OrderWhereInput = {};
  if (f.status) where.status = f.status;
  if (f.method) where.shippingMethod = f.method;
  if (f.pay) where.paymentMethod = f.pay;
  if (f.days) where.createdAt = { gte: new Date(Date.now() - f.days * 86_400_000) };
  if (f.q) {
    const q = toLatinDigits(f.q).replace(/^#/, "");
    const digits = q.replace(/[\s-]/g, "");
    const or: Prisma.OrderWhereInput[] = [
      { user: { name: { contains: f.q, mode: "insensitive" } } },
    ];
    if (/^\d{1,9}$/.test(digits)) or.push({ number: Number(digits) });
    if (/^0?9\d{3,9}$/.test(digits))
      or.push({ user: { mobile: { contains: digits.replace(/^9/, "09") } } });
    where.OR = or;
  }
  const [rows, total, counts] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (f.page - 1) * ADMIN_ORDERS_PAGE,
      take: ADMIN_ORDERS_PAGE,
      select: {
        number: true,
        status: true,
        createdAt: true,
        grandTotal: true,
        shippingMethod: true,
        paymentMethod: true,
        user: { select: { name: true, mobile: true } },
        _count: { select: { items: true, returns: true } },
      },
    }),
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  return {
    rows,
    total,
    pages: Math.max(1, Math.ceil(total / ADMIN_ORDERS_PAGE)),
    counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Partial<
      Record<OrderStatus, number>
    >,
  };
}

export async function getOrderAdmin(number: number) {
  const order = await db.order.findUnique({
    where: { number },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          mobile: true,
          customerType: true,
          refundIban: true,
          // همان شمارشِ فهرست مشتریان: سفارش‌های پرداخت‌نشده و لغوشده حساب نمی‌شوند
          _count: {
            select: { orders: { where: { status: { notIn: ["PENDING_PAYMENT", "CANCELLED"] } } } },
          },
        },
      },
      items: {
        include: {
          variant: { select: { weightGrams: true, product: { select: { slug: true } } } },
        },
      },
      payments: { orderBy: { createdAt: "asc" } },
      shipments: { orderBy: { createdAt: "asc" } },
      refunds: { orderBy: { createdAt: "asc" } },
      returns: {
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, type: true, createdAt: true },
      },
      coupon: { select: { code: true } },
    },
  });
  if (!order) return null;
  const requester = order.cancelRequestedBy
    ? await db.user.findUnique({
        where: { id: order.cancelRequestedBy },
        select: { name: true, mobile: true },
      })
    : null;
  const history = await db.auditLog.findMany({
    where: { entity: "order", entityId: order.id },
    orderBy: { createdAt: "asc" },
    include: { actor: { select: { name: true, mobile: true } } },
  });
  return {
    ...order,
    history,
    cancelRequester: requester ? (requester.name ?? requester.mobile) : null,
  };
}
export type AdminOrder = NonNullable<Awaited<ReturnType<typeof getOrderAdmin>>>;

/** درخواست‌های لغو منتظر تأیید مدیر کل (D-039) */
export const pendingCancels = () =>
  db.order.findMany({
    where: { cancelRequestedAt: { not: null } },
    orderBy: { cancelRequestedAt: "asc" },
    select: {
      number: true,
      status: true,
      grandTotal: true,
      cancelReason: true,
      cancelRequestedAt: true,
      user: { select: { name: true, mobile: true } },
    },
  });
