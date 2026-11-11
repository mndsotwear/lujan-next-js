/** خواندن سفارش برای صفحه‌ی نتیجه، جزئیات و فاکتور (فقط سرور) */
import { db } from "@/lib/db";
import { releaseExpiredReservations } from "./orders";

export async function getOrderForUser(userId: string, number: number) {
  await releaseExpiredReservations();
  return db.order.findFirst({
    where: { number, userId },
    include: {
      items: true,
      payments: { orderBy: { createdAt: "desc" } },
      shipments: true,
      refunds: {
        orderBy: { createdAt: "asc" },
        select: { id: true, amount: true, reference: true, createdAt: true },
      },
      coupon: { select: { code: true } },
      user: { select: { name: true, mobile: true } },
    },
  });
}
export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrderForUser>>>;
