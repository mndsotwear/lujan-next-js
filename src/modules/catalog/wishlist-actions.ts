"use server";
/** علاقه‌مندی‌ها (FR-CAT-07، D-061) — فقط برای کاربر واردشده؛ در پایگاه داده */
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/modules/account/server";
import { getProductSummaries } from "./queries";
import type { ProductSummary } from "./types";

const validId = (id: string) => /^[a-z0-9]{8,40}$/i.test(id);
const MAX_WISHLIST = 100;

export type WishState = { loggedIn: boolean; saved: boolean; full?: boolean };

export async function wishlistStatus(productId: string): Promise<WishState> {
  const u = await getCurrentUser();
  if (!u || !validId(productId)) return { loggedIn: !!u, saved: false };
  const row = await db.wishlistItem.findUnique({
    where: { userId_productId: { userId: u.id, productId } },
  });
  return { loggedIn: true, saved: !!row };
}

export async function toggleWishlist(productId: string): Promise<WishState> {
  const u = await getCurrentUser();
  if (!u) return { loggedIn: false, saved: false };
  if (!validId(productId)) return { loggedIn: true, saved: false };
  const key = { userId_productId: { userId: u.id, productId } };
  const existing = await db.wishlistItem.findUnique({ where: key });
  if (existing) {
    await db.wishlistItem.delete({ where: key });
  } else {
    if ((await db.wishlistItem.count({ where: { userId: u.id } })) >= MAX_WISHLIST)
      return { loggedIn: true, saved: false, full: true };
    const p = await db.product.findUnique({ where: { id: productId }, select: { status: true } });
    if (p?.status !== "PUBLISHED") return { loggedIn: true, saved: false };
    await db.wishlistItem.create({ data: { userId: u.id, productId } });
  }
  revalidatePath("/account/wishlist");
  return { loggedIn: true, saved: !existing };
}

/** «اخیراً دیده‌شده‌ها» در مرورگر نگه داشته می‌شود؛ این‌جا فقط خلاصه‌ی محصولات منتشرشده (داده‌ی عمومی) */
export async function recentSummaries(ids: string[]): Promise<ProductSummary[]> {
  const clean = [...new Set(ids.filter((x) => typeof x === "string" && validId(x)))].slice(0, 12);
  return getProductSummaries(clean);
}
