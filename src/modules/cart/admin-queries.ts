/** کدهای تخفیف برای پنل — فقط سرور */
import { db } from "@/lib/db";

export const listCoupons = () =>
  db.coupon.findMany({
    orderBy: [{ isActive: "desc" }, { code: "asc" }],
    include: { _count: { select: { orders: { where: { status: { not: "CANCELLED" } } } } } },
  });
