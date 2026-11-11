/** خواندن درخواست‌های مرجوعی (فقط سرور) */
import { db } from "@/lib/db";

export async function getReturnsForOrder(orderId: string) {
  return db.returnRequest.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { orderItem: { select: { productName: true } } } } },
  });
}
export type ReturnRow = Awaited<ReturnType<typeof getReturnsForOrder>>[number];

/** آیا این کاربر صاحب سفارشی است که این تصویر به آن پیوست شده؟ (مدیر در M1.9) */
export async function userOwnsReturnImage(userId: string, name: string): Promise<boolean> {
  const r = await db.returnRequest.findFirst({
    where: { imageUrls: { has: name }, order: { userId } },
    select: { id: true },
  });
  return !!r;
}
