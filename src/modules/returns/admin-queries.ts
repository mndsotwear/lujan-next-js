/** مرجوعی‌ها برای پنل (FR-RET-02) — فقط سرور */
import { db } from "@/lib/db";
import type { ReturnStatus } from "./policy";

const OPEN: ReturnStatus[] = ["REQUESTED", "APPROVED", "RECEIVED"];

export async function listReturnsAdmin(filter: "open" | "closed" | "all") {
  return db.returnRequest.findMany({
    where:
      filter === "open"
        ? { status: { in: OPEN } }
        : filter === "closed"
          ? { status: { notIn: OPEN } }
          : {},
    orderBy: { createdAt: filter === "open" ? "asc" : "desc" },
    take: 5000, // صفحه‌بندی در صفحه‌ی پنل
    include: {
      order: { select: { number: true, user: { select: { name: true, mobile: true } } } },
      items: { select: { quantity: true } },
    },
  });
}

export async function getReturnAdmin(id: string) {
  const r = await db.returnRequest.findUnique({
    where: { id },
    include: {
      items: { include: { orderItem: true } },
      refunds: true,
      order: {
        include: {
          user: { select: { name: true, mobile: true } },
          payments: true,
          refunds: true,
        },
      },
    },
  });
  return r;
}
export type AdminReturn = NonNullable<Awaited<ReturnType<typeof getReturnAdmin>>>;

/** تصویر برای کارکنانی که مجوز مرجوعی دارند */
export async function returnImageExists(name: string) {
  return !!(await db.returnRequest.findFirst({
    where: { imageUrls: { has: name } },
    select: { id: true },
  }));
}
