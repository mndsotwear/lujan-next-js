/**
 * بازگشت از درگاه (الگوی زرین‌پال: ?Authority=...&Status=OK|NOK).
 * idempotent: اگر پرداخت قبلاً بررسی شده، فقط به صفحه‌ی نتیجه می‌رود.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { commitReserved, getGateway, notifyOrder } from "@/modules/checkout/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const authority = url.searchParams.get("Authority") ?? "";
  const status = url.searchParams.get("Status");
  const payment = await db.payment.findUnique({
    where: { authority },
    include: { order: { include: { items: true, user: { select: { mobile: true } } } } },
  });
  if (!payment) return NextResponse.redirect(new URL("/account/orders", url));
  const order = payment.order;
  const result = new URL(`/checkout/result/${order.number}`, url);
  if (payment.status !== "PENDING") return NextResponse.redirect(result);

  if (status !== "OK") {
    await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    return NextResponse.redirect(result);
  }

  let verified: Awaited<ReturnType<ReturnType<typeof getGateway>["verify"]>>;
  try {
    verified = await getGateway(payment.gateway).verify({ authority, amount: payment.amount });
  } catch (e) {
    // درگاه در دسترس نبود: پرداخت «در انتظار» می‌ماند؛ بازگشت دوباره به همین نشانی آن را بررسی می‌کند.
    // اگر تأیید هرگز انجام نشود، زرین‌پال مبلغ را خودکار به مشتری برمی‌گرداند.
    console.error("payment verify unreachable", payment.id, e instanceof Error ? e.message : e);
    return NextResponse.redirect(result);
  }
  if (!verified.ok) {
    await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    return NextResponse.redirect(result);
  }

  let paid = false;
  await db.$transaction(async (tx) => {
    const p = await tx.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "SUCCESS", refId: verified.refId, verifiedAt: new Date() },
    });
    if (p.count !== 1) return;
    // سفارش هنوز منتظر پرداخت است؛ اگر در همین لحظه منقضی و لغو شده، پرداخت برای بازگشت وجه علامت می‌خورد
    const o = await tx.order.updateMany({
      where: { id: order.id, status: "PENDING_PAYMENT" },
      data: { status: "PAID", reservedUntil: null },
    });
    if (o.count !== 1) {
      await tx.order.update({
        where: { id: order.id },
        data: { internalNote: "پرداخت پس از لغو خودکار انجام شد — بازگشت وجه لازم است" },
      });
      return;
    }
    for (const it of order.items) await commitReserved(tx, it.variantId, it.quantity, order.id);
    if (order.couponId)
      await tx.coupon.update({
        where: { id: order.couponId },
        data: { usedCount: { increment: 1 } },
      });
    await tx.cartItem.deleteMany({
      where: {
        cart: { userId: order.userId },
        savedForLater: false,
        variantId: { in: order.items.map((i) => i.variantId) },
      },
    });
    await tx.cart.updateMany({ where: { userId: order.userId }, data: { couponId: null } });
    paid = true;
  });
  if (paid)
    await notifyOrder(order.user.mobile, order.number, "paid", {
      amount: order.grandTotal,
      pickupCode: order.pickupCode,
    });
  return NextResponse.redirect(result);
}
