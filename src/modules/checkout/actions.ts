"use server";
/** ثبت سفارش و پرداخت (FR-CHK-01..09) */
import { headers } from "next/headers";
import { STORE } from "@/config/store";
import { fa } from "@/content/fa";
import { db } from "@/lib/db";
import { toLatinDigits } from "@/lib/format";
import { hit } from "@/lib/rate-limit";
import { normalizeMobile } from "@/modules/account";
import { clientIp, getCurrentUser } from "@/modules/account/server";
import { getCart } from "@/modules/cart/server";
import { getGateway } from "./gateway";
import {
  commitDirect,
  notifyOrder,
  OutOfStockError,
  releaseExpiredReservations,
  reserve,
} from "./orders";
import {
  codAllowed,
  makePickupCode,
  reservationExpired,
  type OrderStatus,
  type PaymentMethod,
  type ShippingMethod,
} from "./rules";
import { parcelOf, quoteShipping } from "./shipping";

export type PlaceOrderInput = {
  addressId: string | null;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  officialInvoice: boolean;
};
export type PlaceOrderResult =
  { ok: true; redirect: string } | { ok: false; message: string; refresh?: boolean };

async function origin() {
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: fa.checkout.errors.login };
  await releaseExpiredReservations();

  const view = await getCart();
  if (!view.lines.length) return { ok: false, message: fa.cart.empty };
  // اگر قیمت یا موجودی از آخرین نمایش تغییر کرده، مشتری اول باید ببیند (FR-CART-03)
  if (view.notices.length)
    return { ok: false, message: fa.checkout.errors.cartChanged, refresh: true };
  if (view.lines.some((l) => l.stock === "out" || l.quantity > l.available))
    return { ok: false, message: fa.checkout.errors.stock, refresh: true };

  let address = null;
  if (input.shippingMethod !== "PICKUP") {
    address = input.addressId
      ? await db.address.findFirst({ where: { id: input.addressId, userId: user.id } })
      : null;
    if (!address) return { ok: false, message: fa.checkout.errors.address };
  }
  const quote = quoteShipping(input.shippingMethod, address, parcelOf(view.lines));
  if (!quote.available) return { ok: false, message: fa.checkout.errors.shipping };

  const t = view.totals;
  const shipping = t.freeShipping ? 0 : quote.cost;
  const grandTotal = t.total + shipping;
  if (
    input.paymentMethod === "COD" &&
    !codAllowed(input.shippingMethod, address?.city ?? null, grandTotal)
  )
    return { ok: false, message: fa.checkout.errors.cod };

  let invoiceInfo = null;
  if (input.officialInvoice) {
    const u = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    const inv = (u.invoiceInfo ?? {}) as {
      companyName?: string;
      nationalId?: string;
      economicCode?: string;
    };
    if (!inv.companyName || !inv.nationalId)
      return { ok: false, message: fa.checkout.errors.invoice };
    invoiceInfo = inv;
  }

  const coupon =
    view.coupon && !view.coupon.error
      ? await db.coupon.findUnique({ where: { code: view.coupon.code } })
      : null;
  const isCod = input.paymentMethod === "COD";
  const pickupCode = input.shippingMethod === "PICKUP" ? makePickupCode() : null;

  let order;
  try {
    order = await db.$transaction(async (tx) => {
      const o = await tx.order.create({
        data: {
          userId: user.id,
          status: isCod ? "PROCESSING" : "PENDING_PAYMENT",
          subtotal: t.subtotal,
          discountTotal: t.couponDiscount,
          shippingCost: shipping,
          taxTotal: 0, // قیمت‌ها شامل مالیات (D-018)
          grandTotal,
          couponId: coupon?.id ?? null,
          paymentMethod: input.paymentMethod,
          shippingMethod: input.shippingMethod,
          shippingAddress: address
            ? {
                title: address.title,
                province: address.province,
                city: address.city,
                postalCode: address.postalCode,
                line: address.line,
                recipient: address.recipient,
                phone: address.phone,
              }
            : undefined,
          pickupCode,
          officialInvoice: input.officialInvoice,
          invoiceInfo: invoiceInfo ?? undefined,
          reservedUntil: isCod ? null : new Date(Date.now() + STORE.reservationMinutes * 60_000),
          items: {
            create: view.lines.map((l) => ({
              variantId: l.variantId,
              productName: l.variantLabel ? `${l.name} — ${l.variantLabel}` : l.name,
              sku: "",
              unitPrice: l.unitPrice,
              quantity: l.quantity,
            })),
          },
        },
        include: { items: true },
      });
      // SKU در لحظه‌ی خرید
      const variants = await tx.variant.findMany({
        where: { id: { in: view.lines.map((l) => l.variantId) } },
        select: { id: true, sku: true, costPrice: true },
      });
      for (const it of o.items) {
        const v = variants.find((x) => x.id === it.variantId);
        await tx.orderItem.update({
          where: { id: it.id },
          // SKU و قیمت خرید در لحظه‌ی فروش (D-050)
          data: { sku: v?.sku ?? "", unitCost: v?.costPrice ?? null },
        });
      }

      for (const l of view.lines) {
        if (isCod) await commitDirect(tx, l.variantId, l.quantity, o.id);
        else await reserve(tx, l.variantId, l.quantity);
      }
      if (isCod) {
        await tx.payment.create({ data: { orderId: o.id, gateway: "cod", amount: grandTotal } });
        if (coupon)
          await tx.coupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } },
          });
        await tx.cartItem.deleteMany({
          where: { cart: { userId: user.id }, savedForLater: false },
        });
        await tx.cart.updateMany({ where: { userId: user.id }, data: { couponId: null } });
      }
      return o;
    });
  } catch (e) {
    if (e instanceof OutOfStockError)
      return { ok: false, message: fa.checkout.errors.stock, refresh: true };
    throw e;
  }

  if (isCod) {
    await notifyOrder(user.mobile, order.number, "placed", { amount: grandTotal, pickupCode });
    return { ok: true, redirect: `/checkout/result/${order.number}` };
  }
  return startPayment(order.id, order.number, grandTotal, user.mobile);
}

async function startPayment(
  orderId: string,
  number: number,
  amount: number,
  mobile: string,
): Promise<PlaceOrderResult> {
  const gateway = getGateway();
  const { authority, redirectUrl } = await gateway.request({
    amount,
    mobile,
    description: fa.checkout.paymentDescription(number),
    callbackUrl: `${await origin()}/api/payment/callback`,
  });
  await db.payment.create({ data: { orderId, gateway: gateway.name, amount, authority } });
  return { ok: true, redirect: redirectUrl };
}

/** تلاش دوباره برای پرداخت از همان صفحه (FR-CHK-07) */
export async function retryPayment(orderNumber: number): Promise<PlaceOrderResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: fa.checkout.errors.login };
  await releaseExpiredReservations();
  const order = await db.order.findFirst({ where: { number: orderNumber, userId: user.id } });
  if (!order) return { ok: false, message: fa.checkout.errors.notFound };
  if (order.status !== "PENDING_PAYMENT" || reservationExpired(order.reservedUntil))
    return { ok: false, message: fa.checkout.errors.expired };
  return startPayment(order.id, order.number, order.grandTotal, user.mobile);
}

/** سفارش مجدد (FR-ACC-03): اقلام موجود به سبد برمی‌گردند */
export async function reorder(orderNumber: number): Promise<{ ok: boolean; added: number }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, added: 0 };
  const order = await db.order.findFirst({
    where: { number: orderNumber, userId: user.id },
    include: { items: true },
  });
  if (!order) return { ok: false, added: 0 };
  const { addToCart } = await import("@/modules/cart/actions");
  let added = 0;
  for (const it of order.items) {
    const r = await addToCart(it.variantId, it.quantity);
    if (r.ok) added++;
  }
  return { ok: added > 0, added };
}

/** نتیجه‌ی پیگیری مهمان (D-031): بدون آدرس و مبلغ */
export type TrackResult =
  | {
      ok: true;
      number: number;
      status: OrderStatus;
      shippingMethod: ShippingMethod;
      createdAt: string;
      itemCount: number;
      shipments: { carrier: ShippingMethod; trackingCode: string | null }[];
      isOwner: boolean;
    }
  | { ok: false; message: string };

/** پیگیری سفارش با شماره و موبایل خریدار (FR-SHP-05) */
export async function trackOrder(numberInput: string, mobileInput: string): Promise<TrackResult> {
  const t = fa.track.errors;
  const ip = (await clientIp()) ?? "unknown";
  if (!hit(`track:${ip}`, 10, 10 * 60_000)) return { ok: false, message: t.rateLimited };
  const number = Number(toLatinDigits(numberInput).trim());
  const mobile = normalizeMobile(mobileInput);
  if (!Number.isSafeInteger(number) || number <= 0 || !mobile)
    return { ok: false, message: t.invalid };
  await releaseExpiredReservations();
  const order = await db.order.findFirst({
    where: { number, user: { mobile } },
    include: { items: { select: { quantity: true } }, shipments: true },
  });
  // پیام یکسان برای «سفارش نیست» و «موبایل نمی‌خواند» تا شماره‌ها قابل حدس نباشند
  if (!order) return { ok: false, message: t.notFound };
  const user = await getCurrentUser();
  return {
    ok: true,
    number: order.number,
    status: order.status,
    shippingMethod: order.shippingMethod,
    createdAt: order.createdAt.toISOString(),
    itemCount: order.items.reduce((s, i) => s + i.quantity, 0),
    shipments: order.shipments.map((s) => ({ carrier: s.carrier, trackingCode: s.trackingCode })),
    isOwner: user?.id === order.userId,
  };
}
