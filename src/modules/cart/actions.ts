"use server";
/** عملیات سبد (FR-CART-01..04, 07، FR-REC-05) — هر کدام CartView تازه برمی‌گرداند تا رابط بدون بارگذاری مجدد به‌روز شود. */
import { activeDeal, effectivePrice } from "@/modules/catalog/deals";
import { cookies } from "next/headers";
import { STORE } from "@/config/store";
import { fa } from "@/content/fa";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/modules/account/server";
import { availableQty } from "@/modules/catalog";
import { normalizeCode } from "./coupon";
import { buildCartView, CART_COOKIE, EMPTY_CART, getCartId } from "./queries";
import type { CartView } from "./types";

export type CartActionResult = { ok: boolean; view: CartView; message?: string };

async function ensureCart(): Promise<string> {
  const existing = await getCartId();
  if (existing) {
    const found = await db.cart.findUnique({
      where: { sessionId: existing },
      select: { id: true },
    });
    if (found) return existing;
  }
  const sessionId = crypto.randomUUID();
  const user = await getCurrentUser(); // سبد کاربر واردشده به حسابش وصل می‌شود
  await db.cart.create({ data: { sessionId, userId: user?.id ?? null } });
  (await cookies()).set(CART_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return sessionId;
}

async function result(
  sessionId: string | null,
  ok = true,
  message?: string,
): Promise<CartActionResult> {
  return { ok, message, view: sessionId ? await buildCartView(sessionId) : EMPTY_CART };
}

async function ownedItem(itemId: string) {
  const sessionId = await getCartId();
  if (!sessionId) return null;
  const item = await db.cartItem.findFirst({
    where: { id: itemId, cart: { sessionId } },
    include: { variant: { include: { inventory: true } } },
  });
  return item ? { item, sessionId } : null;
}

export async function addToCart(variantId: string, qty = 1): Promise<CartActionResult> {
  const quantity = Math.max(1, Math.min(Math.floor(qty) || 1, STORE.maxQtyPerItem));
  const variant = await db.variant.findUnique({
    where: { id: variantId },
    include: {
      inventory: true,
      product: {
        select: {
          status: true,
          flashDeals: {
            where: { isActive: true },
            select: { percent: true, startsAt: true, endsAt: true, isActive: true },
          },
        },
      },
    },
  });
  if (!variant || !variant.isActive || variant.product.status !== "PUBLISHED")
    return result(await getCartId(), false, fa.cart.errors.notFound);
  const available = variant.inventory ? availableQty(variant.inventory) : 0;
  if (available === 0) return result(await getCartId(), false, fa.cart.errors.outOfStock);

  const sessionId = await ensureCart();
  const cart = await db.cart.findUniqueOrThrow({ where: { sessionId }, select: { id: true } });
  const existing = await db.cartItem.findUnique({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
  });
  const wanted = (existing && !existing.savedForLater ? existing.quantity : 0) + quantity;
  const finalQty = Math.min(wanted, available, STORE.maxQtyPerItem);
  const price = effectivePrice(variant, activeDeal(variant.product.flashDeals)).price;
  await db.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    update: { quantity: finalQty, savedForLater: false, priceAtAdd: price },
    create: { cartId: cart.id, variantId, quantity: finalQty, priceAtAdd: price },
  });
  return result(sessionId, true, finalQty < wanted ? fa.cart.errors.limited(finalQty) : undefined);
}

export async function setQuantity(itemId: string, qty: number): Promise<CartActionResult> {
  const found = await ownedItem(itemId);
  if (!found) return result(await getCartId(), false, fa.cart.errors.notFound);
  if (qty <= 0) {
    await db.cartItem.delete({ where: { id: itemId } });
    return result(found.sessionId);
  }
  const available = found.item.variant.inventory ? availableQty(found.item.variant.inventory) : 0;
  const finalQty = Math.min(Math.floor(qty), available, STORE.maxQtyPerItem);
  await db.cartItem.update({ where: { id: itemId }, data: { quantity: Math.max(1, finalQty) } });
  return result(
    found.sessionId,
    true,
    finalQty < qty ? fa.cart.errors.limited(finalQty) : undefined,
  );
}

export async function removeItem(itemId: string): Promise<CartActionResult> {
  return setQuantity(itemId, 0);
}

/** ذخیره برای بعد و برگرداندن به سبد (FR-CART-07) */
export async function setSavedForLater(itemId: string, saved: boolean): Promise<CartActionResult> {
  const found = await ownedItem(itemId);
  if (!found) return result(await getCartId(), false, fa.cart.errors.notFound);
  await db.cartItem.update({ where: { id: itemId }, data: { savedForLater: saved } });
  return result(found.sessionId);
}

export async function applyCoupon(code: string): Promise<CartActionResult> {
  const sessionId = await getCartId();
  if (!sessionId) return result(null, false, fa.cart.errors.empty);
  const coupon = await db.coupon.findUnique({ where: { code: normalizeCode(code) } });
  if (!coupon) return result(sessionId, false, fa.cart.couponErrors.notFound);
  await db.cart.update({ where: { sessionId }, data: { couponId: coupon.id } });
  const r = await result(sessionId);
  // اگر کد هست ولی شرطش برقرار نیست، پیام دلیل را برگردان (کد روی سبد می‌ماند تا با تغییر سبد فعال شود)
  return r.view.coupon?.error
    ? { ...r, ok: false, message: r.view.coupon.error }
    : { ...r, message: fa.cart.couponApplied(coupon.code) };
}

export async function removeCoupon(): Promise<CartActionResult> {
  const sessionId = await getCartId();
  if (sessionId) await db.cart.update({ where: { sessionId }, data: { couponId: null } });
  return result(sessionId);
}
