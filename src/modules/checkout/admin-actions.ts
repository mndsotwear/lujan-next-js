"use server";
/** کارهای اپراتور روی سفارش (FR-ADM-04، D-037..D-039) — هر کدام با مجوز و ثبت در تاریخچه */
import { revalidatePath } from "next/cache";
import { expireCatalog } from "@/lib/cache";
import { STORE } from "@/config/store";
import { fa } from "@/content/fa";
import { db } from "@/lib/db";
import { formatNumber, formatOrderNumber, toLatinDigits } from "@/lib/format";
import { audit, staffWith } from "@/modules/admin/server";
import {
  needsTrackingCode,
  normalizeTrackingCode,
  operatorNextStatuses,
  refundableAmount,
  stockOnCancel,
  validateRefund,
  validTrackingCode,
} from "./fulfilment";
import { releaseReserved, sendOrderSms } from "./orders";
import type { OrderStatus } from "./rules";

export type AdminResult = { ok: boolean; message: string };
const t = fa.admin.orders;

const refresh = (n: number) => {
  expireCatalog(); // لغو و برگشت موجودی
  revalidatePath(`/admin/orders/${n}`);
  revalidatePath("/admin/orders");
  revalidatePath(`/account/orders/${n}`);
};

export async function setOrderStatus(
  number: number,
  to: OrderStatus,
  trackingInput = "",
): Promise<AdminResult> {
  // لغو فقط با تأیید مدیر کل (D-039): cancelOrder / requestCancel
  if (to === "CANCELLED") return { ok: false, message: t.cancelNeedsAdmin };
  const me = await staffWith("orders.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  return transition(me.id, number, to, trackingInput);
}

/** مدیر کل: لغو مستقیم با دلیل */
export async function cancelOrder(number: number, reason: string): Promise<AdminResult> {
  const me = await staffWith("orders.cancel");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const why = reason.trim().slice(0, 500);
  if (why.length < 3) return { ok: false, message: t.cancelReasonRequired };
  return transition(me.id, number, "CANCELLED", "", { reason: why });
}

/** اپراتور: درخواست لغو برای تأیید مدیر کل */
export async function requestCancel(number: number, reason: string): Promise<AdminResult> {
  const me = await staffWith("orders.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const why = reason.trim().slice(0, 500);
  if (why.length < 3) return { ok: false, message: t.cancelReasonRequired };
  const o = await db.order.findUnique({ where: { number } });
  if (!o) return { ok: false, message: t.notFound };
  if (!operatorNextStatuses(o).includes("CANCELLED")) return { ok: false, message: t.notAllowed };
  const res = await db.order.updateMany({
    where: { id: o.id, status: o.status, cancelRequestedAt: null },
    data: { cancelRequestedAt: new Date(), cancelRequestedBy: me.id, cancelReason: why },
  });
  if (res.count !== 1) return { ok: false, message: t.cancelPending };
  await audit(me.id, "order.cancelRequest", "order", o.id, { reason: why });
  refresh(o.number);
  revalidatePath("/admin/inbox");
  return { ok: true, message: t.cancelRequested };
}

/** مدیر کل: تأیید درخواست لغو */
export async function approveCancel(number: number): Promise<AdminResult> {
  const me = await staffWith("orders.cancel");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const o = await db.order.findUnique({ where: { number } });
  if (!o?.cancelRequestedAt) return { ok: false, message: t.notAllowed };
  const r = await transition(me.id, number, "CANCELLED", "", {
    reason: o.cancelReason ?? "",
    requestedBy: o.cancelRequestedBy,
  });
  revalidatePath("/admin/inbox");
  return r;
}

/** مدیر کل: رد درخواست لغو */
export async function rejectCancel(number: number, note: string): Promise<AdminResult> {
  const me = await staffWith("orders.cancel");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const o = await db.order.findUnique({ where: { number } });
  if (!o?.cancelRequestedAt) return { ok: false, message: t.notAllowed };
  await db.order.update({
    where: { id: o.id },
    data: { cancelRequestedAt: null, cancelRequestedBy: null, cancelReason: null },
  });
  await audit(me.id, "order.cancelReject", "order", o.id, {
    note: note.trim().slice(0, 500) || null,
  });
  refresh(o.number);
  revalidatePath("/admin/inbox");
  return { ok: true, message: t.done };
}

async function transition(
  actorId: string,
  number: number,
  to: OrderStatus,
  trackingInput: string,
  cancelInfo?: { reason: string; requestedBy?: string | null },
): Promise<AdminResult> {
  const me = { id: actorId };
  const o = await db.order.findUnique({
    where: { number },
    include: { items: true, user: { select: { mobile: true } }, payments: true, refunds: true },
  });
  if (!o) return { ok: false, message: t.notFound };
  if (!operatorNextStatuses(o).includes(to)) return { ok: false, message: t.notAllowed };
  // تا تصمیم مدیر کل درباره‌ی درخواست لغو، سفارش جلو نمی‌رود
  if (o.cancelRequestedAt && to !== "CANCELLED") return { ok: false, message: t.cancelPending };

  const code = normalizeTrackingCode(trackingInput);
  if (to === "SHIPPED") {
    if (needsTrackingCode(o.shippingMethod) && !code)
      return { ok: false, message: t.trackingRequired };
    if (code && !validTrackingCode(code)) return { ok: false, message: t.trackingInvalid };
  }

  const n = formatOrderNumber(o.number);
  try {
    await applyStatus(o, to, code, me.id);
  } catch (e) {
    if (e instanceof Error && e.message === "STALE") return { ok: false, message: t.notAllowed };
    throw e;
  }

  await audit(me.id, "order.status", "order", o.id, {
    from: o.status,
    to,
    ...(code ? { trackingCode: code } : {}),
    ...(cancelInfo ?? {}),
  });
  const mobile = o.user.mobile;
  if (to === "READY_FOR_PICKUP" && o.pickupCode)
    await sendOrderSms(mobile, fa.admin.sms.ready(n, o.pickupCode, STORE.storeLocation.city));
  if (to === "SHIPPED")
    await sendOrderSms(
      mobile,
      fa.admin.sms.shipped(n, fa.checkout.methods[o.shippingMethod], code),
    );
  if (to === "CANCELLED") await sendOrderSms(mobile, fa.admin.sms.cancelled(n));

  refresh(o.number);
  if (to === "CANCELLED") {
    const left = refundableAmount(o.payments, o.refunds);
    return {
      ok: true,
      message: left > 0 ? `${t.cancelled} ${t.cancelRefundHint(formatNumber(left))}` : t.cancelled,
    };
  }
  return { ok: true, message: t.done };
}

type OrderForStatus = {
  id: string;
  status: OrderStatus;
  paymentMethod: "ONLINE" | "COD";
  shippingMethod: "PICKUP" | "COURIER" | "TIPAX" | "POST";
  items: { variantId: string; quantity: number }[];
};

async function applyStatus(o: OrderForStatus, to: OrderStatus, code: string, actorId: string) {
  const me = { id: actorId };
  await db.$transaction(async (tx) => {
    // شرط وضعیت قبلی: اگر دو اپراتور هم‌زمان تغییر دهند، دومی اثری ندارد
    const changed = await tx.order.updateMany({
      where: { id: o.id, status: o.status },
      data: {
        status: to,
        ...(to === "DELIVERED" ? { deliveredAt: new Date() } : {}),
        ...(to === "CANCELLED"
          ? { reservedUntil: null, cancelRequestedAt: null, cancelRequestedBy: null }
          : {}),
      },
    });
    if (changed.count !== 1) throw new Error("STALE");

    if (to === "CANCELLED") {
      const mode = stockOnCancel(o);
      for (const it of o.items) {
        if (mode === "release_reservation") await releaseReserved(tx, it.variantId, it.quantity);
        else {
          await tx.inventory.update({
            where: { variantId: it.variantId },
            data: { onHand: { increment: it.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              variantId: it.variantId,
              delta: it.quantity,
              reason: "RETURN",
              note: "لغو سفارش",
              actorId: me.id,
              orderId: o.id,
            },
          });
        }
      }
      await tx.payment.updateMany({
        where: { orderId: o.id, status: "PENDING" },
        data: { status: "FAILED" },
      });
    }
    if (to === "SHIPPED")
      await tx.shipment.create({
        data: {
          orderId: o.id,
          carrier: o.shippingMethod,
          trackingCode: code || null,
          status: "HANDED_OVER",
        },
      });
    if (to === "DELIVERED") {
      await tx.shipment.updateMany({ where: { orderId: o.id }, data: { status: "DELIVERED" } });
      // پرداخت در محل: پول هنگام تحویل گرفته شد
      await tx.payment.updateMany({
        where: { orderId: o.id, gateway: "cod", status: "PENDING" },
        data: { status: "SUCCESS", verifiedAt: new Date() },
      });
    }
  });
}

/** کد رهگیری اضافه یا اصلاحی (مثلاً ارسال دوباره) */
export async function addTracking(number: number, input: string): Promise<AdminResult> {
  const me = await staffWith("orders.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const code = normalizeTrackingCode(input);
  if (!validTrackingCode(code)) return { ok: false, message: t.trackingInvalid };
  const o = await db.order.findUnique({ where: { number } });
  if (!o || o.shippingMethod === "PICKUP") return { ok: false, message: t.notFound };
  await db.shipment.create({
    data: { orderId: o.id, carrier: o.shippingMethod, trackingCode: code, status: "HANDED_OVER" },
  });
  await audit(me.id, "order.tracking", "order", o.id, { trackingCode: code });
  refresh(o.number);
  return { ok: true, message: t.done };
}

export async function saveOrderNote(number: number, note: string): Promise<AdminResult> {
  const me = await staffWith("orders.view");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const o = await db.order.findUnique({
    where: { number },
    select: { id: true, internalNote: true },
  });
  if (!o) return { ok: false, message: t.notFound };
  const clean = note.trim().slice(0, 2000) || null;
  await db.order.update({ where: { id: o.id }, data: { internalNote: clean } });
  await audit(me.id, "order.note", "order", o.id, { note: clean });
  refresh(number);
  return { ok: true, message: t.done };
}

/** ثبت بازپرداخت دستی (D-038) */
export async function recordRefund(
  number: number,
  amountInput: string,
  referenceInput: string,
  returnId?: string,
): Promise<AdminResult> {
  const reference = toLatinDigits(referenceInput).replace(/\s+/g, "");
  const me = await staffWith(returnId ? "returns.manage" : "orders.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const o = await db.order.findUnique({
    where: { number },
    include: { payments: true, refunds: true, user: { select: { mobile: true } } },
  });
  if (!o) return { ok: false, message: t.notFound };
  const amount = Number(
    amountInput.replace(/[^\d۰-۹]/g, "").replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))),
  );
  const err = validateRefund(amount, reference, refundableAmount(o.payments, o.refunds));
  if (err) return { ok: false, message: t.refundErrors[err] };
  const r = await db.refund.create({
    data: {
      orderId: o.id,
      returnId: returnId ?? null,
      amount,
      reference: reference.trim(),
      actorId: me.id,
    },
  });
  await audit(me.id, "order.refund", "order", o.id, { amount, reference: r.reference, returnId });
  await sendOrderSms(
    o.user.mobile,
    fa.admin.sms.refunded(formatOrderNumber(o.number), formatNumber(amount)),
  );
  refresh(o.number);
  return { ok: true, message: t.done };
}
