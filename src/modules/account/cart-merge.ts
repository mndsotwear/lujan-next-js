/** ادغام سبد مهمان با سبد کاربر پس از ورود (FR-CART-02) */
import { cookies } from "next/headers";
import { STORE } from "@/config/store";
import { db } from "@/lib/db";
import { CART_COOKIE } from "@/modules/cart/server";
import { mergeCartItems } from "./merge";

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

export async function attachCartToUser(userId: string) {
  const jar = await cookies();
  const guestSession = jar.get(CART_COOKIE)?.value;
  const guest = guestSession
    ? await db.cart.findUnique({ where: { sessionId: guestSession }, include: { items: true } })
    : null;
  const userCart = await db.cart.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { items: true },
  });

  if (guest && !guest.userId && !userCart) {
    await db.cart.update({ where: { id: guest.id }, data: { userId } });
    return;
  }
  if (!userCart) return;
  if (guest && guest.id !== userCart.id && !guest.userId) {
    const merged = mergeCartItems(userCart.items, guest.items, STORE.maxQtyPerItem);
    await db.$transaction([
      db.cartItem.deleteMany({ where: { cartId: userCart.id } }),
      db.cartItem.createMany({ data: merged.map((m) => ({ ...m, cartId: userCart.id })) }),
      db.cart.update({
        where: { id: userCart.id },
        data: { couponId: userCart.couponId ?? guest.couponId },
      }),
      db.cart.delete({ where: { id: guest.id } }),
    ]);
  }
  if (userCart.sessionId) jar.set(CART_COOKIE, userCart.sessionId, cookieOpts);
}
