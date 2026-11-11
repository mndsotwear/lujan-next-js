/**
 * ثبت سفارش، رزرو و قطعی کردن موجودی، و آزادسازی رزروهای منقضی (FR-CHK-07, 08، FR-INV-01).
 * همه‌ی تغییرات موجودی اتمی‌اند: رزرو فقط وقتی انجام می‌شود که «قابل‌فروش ≥ تعداد» باشد.
 */
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSmsSender, maskMobile } from "@/modules/account/server";
import { fa } from "@/content/fa";
import { formatNumber, formatOrderNumber } from "@/lib/format";

type Tx = Prisma.TransactionClient;
export class OutOfStockError extends Error {
  constructor(public variantId: string) {
    super("OUT_OF_STOCK");
  }
}

/** رزرو موقت هنگام پرداخت آنلاین */
export async function reserve(tx: Tx, variantId: string, qty: number) {
  const n =
    await tx.$executeRaw`UPDATE "Inventory" SET "reserved" = "reserved" + ${qty}, "updatedAt" = NOW()
    WHERE "variantId" = ${variantId} AND "onHand" - "reserved" - "safetyStock" >= ${qty}`;
  if (n !== 1) throw new OutOfStockError(variantId);
}

/** کسر قطعی از موجودی بدون رزرو قبلی (پرداخت در محل) */
export async function commitDirect(tx: Tx, variantId: string, qty: number, orderId: string) {
  const n =
    await tx.$executeRaw`UPDATE "Inventory" SET "onHand" = "onHand" - ${qty}, "updatedAt" = NOW()
    WHERE "variantId" = ${variantId} AND "onHand" - "reserved" - "safetyStock" >= ${qty}`;
  if (n !== 1) throw new OutOfStockError(variantId);
  await tx.stockMovement.create({
    data: { variantId, delta: -qty, reason: "SALE_ONLINE", orderId },
  });
}

/** تبدیل رزرو به فروش قطعی پس از پرداخت موفق */
export async function commitReserved(tx: Tx, variantId: string, qty: number, orderId: string) {
  await tx.$executeRaw`UPDATE "Inventory" SET "onHand" = "onHand" - ${qty}, "reserved" = GREATEST("reserved" - ${qty}, 0), "updatedAt" = NOW()
    WHERE "variantId" = ${variantId}`;
  await tx.stockMovement.create({
    data: { variantId, delta: -qty, reason: "SALE_ONLINE", orderId },
  });
}

export async function releaseReserved(tx: Tx, variantId: string, qty: number) {
  await tx.$executeRaw`UPDATE "Inventory" SET "reserved" = GREATEST("reserved" - ${qty}, 0), "updatedAt" = NOW() WHERE "variantId" = ${variantId}`;
}

/** سفارش‌های پرداخت‌نشده‌ای که مهلتشان گذشته لغو و رزروشان آزاد می‌شود (FR-CHK-07). */
export async function releaseExpiredReservations(): Promise<number> {
  const expired = await db.order.findMany({
    where: {
      status: "PENDING_PAYMENT",
      paymentMethod: "ONLINE",
      reservedUntil: { lt: new Date() },
    },
    include: { items: true },
    take: 50,
  });
  for (const o of expired) {
    await db.$transaction(async (tx) => {
      // فقط اگر هنوز در همان وضعیت است (جلوگیری از آزادسازی دوباره)
      const changed = await tx.order.updateMany({
        where: { id: o.id, status: "PENDING_PAYMENT" },
        data: { status: "CANCELLED", internalNote: "لغو خودکار: مهلت پرداخت تمام شد" },
      });
      if (changed.count !== 1) return;
      for (const it of o.items) await releaseReserved(tx, it.variantId, it.quantity);
      await tx.payment.updateMany({
        where: { orderId: o.id, status: "PENDING" },
        data: { status: "FAILED" },
      });
    });
  }
  return expired.length;
}

/** اعلان وضعیت سفارش (FR-CHK-10) — خطای پیامک سفارش را خراب نمی‌کند */
/** پیامک آزاد سفارش (D-037)؛ شکست ارسال، عملیات را متوقف نمی‌کند */
export async function sendOrderSms(mobile: string, text: string) {
  try {
    await getSmsSender().sendText(mobile, text);
  } catch (e) {
    console.error("order sms failed", maskMobile(mobile), e);
  }
}

export async function notifyOrder(
  mobile: string,
  number: number,
  event: keyof typeof fa.checkout.sms,
  extra?: { amount?: number; pickupCode?: string | null },
) {
  const text = fa.checkout.sms[event](
    formatOrderNumber(number),
    extra?.amount ? formatNumber(extra.amount) : "",
    extra?.pickupCode ?? "",
  );
  try {
    await getSmsSender().sendText(mobile, text);
  } catch (e) {
    console.error("order sms failed", maskMobile(mobile), e);
  }
}
