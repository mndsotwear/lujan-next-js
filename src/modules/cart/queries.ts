/**
 * خواندن سبد از پایگاه داده و ساخت CartView (فقط سرور).
 * شناسه‌ی سبد مهمان در کوکی httpOnly «cart» است (FR-CART-02)؛ ادغام با سبد حساب در M1.6.
 * هر بار خواندن، موجودی و قیمت زنده بررسی می‌شود (FR-CART-03) و پیام تغییرات یک‌بار نشان داده می‌شود.
 */
import { cookies } from "next/headers";
import { cache } from "react";
import { STORE } from "@/config/store";
import { fa } from "@/content/fa";
import { db } from "@/lib/db";
import { availableQty, stockState } from "@/modules/catalog";
import { getProductSummaries } from "@/modules/catalog/server";
import { evaluateCoupon } from "./coupon";
import { computeTotals, countable } from "./pricing";
import { bundleDiscount } from "./bundles";
import { activeDeal, effectivePrice } from "@/modules/catalog/deals";
import { activeBundleRules } from "@/modules/promotions/server";
import { pickRecommendations, type Candidate } from "./recommend";
import type { CartLine, CartNotice, CartView } from "./types";

export const CART_COOKIE = "cart";

const cartInclude = {
  coupon: true,
  items: {
    orderBy: { createdAt: "asc" as const },
    include: {
      variant: {
        include: {
          inventory: true,
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
              status: true,
              category: { select: { icon: true } },
              flashDeals: {
                where: { isActive: true },
                select: { percent: true, startsAt: true, endsAt: true, isActive: true },
              },
              images: {
                select: { url: true },
                orderBy: { sortOrder: "asc" as const },
                take: 1,
              },
            },
          },
        },
      },
    },
  },
};

export const EMPTY_CART: CartView = {
  lines: [],
  saved: [],
  coupon: null,
  totals: computeTotals([], null),
  notices: [],
  recommendations: [],
};

export async function getCartId(): Promise<string | null> {
  return (await cookies()).get(CART_COOKIE)?.value ?? null;
}

async function buildView(sessionId: string): Promise<CartView> {
  const cart = await db.cart.findUnique({ where: { sessionId }, include: cartInclude });
  if (!cart) return EMPTY_CART;

  const notices: CartNotice[] = [];
  const lines: CartLine[] = [];
  for (const it of cart.items) {
    const v = it.variant;
    const p = v.product;
    if (p.status !== "PUBLISHED" || !v.isActive) {
      await db.cartItem.delete({ where: { id: it.id } });
      notices.push({ kind: "out_of_stock", name: p.name });
      continue;
    }
    const inv = v.inventory ?? { onHand: 0, reserved: 0, safetyStock: 0, lowStockThreshold: 3 };
    const available = availableQty(inv);
    const eff = effectivePrice(v, activeDeal(p.flashDeals));
    const unitPrice = eff.price;
    let quantity = it.quantity;
    const updates: { quantity?: number; priceAtAdd?: number } = {};
    if (!it.savedForLater && available > 0 && quantity > available) {
      quantity = available;
      updates.quantity = available;
      notices.push({ kind: "qty_reduced", name: p.name, detail: available });
    }
    if (!it.savedForLater && available === 0) notices.push({ kind: "out_of_stock", name: p.name });
    if (unitPrice !== it.priceAtAdd) {
      notices.push({
        kind: unitPrice > it.priceAtAdd ? "price_up" : "price_down",
        name: p.name,
        detail: Math.abs(unitPrice - it.priceAtAdd),
      });
      updates.priceAtAdd = unitPrice; // پیام فقط یک بار
    }
    if (Object.keys(updates).length)
      await db.cartItem.update({ where: { id: it.id }, data: updates });
    const attrs = Object.values((v.attributes ?? {}) as Record<string, string>);
    lines.push({
      id: it.id,
      variantId: v.id,
      productId: p.id,
      slug: p.slug,
      name: p.name,
      variantLabel: attrs.length ? attrs.join("، ") : null,
      icon: p.category.icon ?? "coffee",
      image: p.images[0]?.url ?? null,
      unitPrice,
      oldUnitPrice: eff.oldPrice,
      priceAtAdd: it.priceAtAdd,
      quantity,
      available,
      stock: stockState(inv),
      savedForLater: it.savedForLater,
      weightGrams: v.weightGrams,
      volumeCm3: (v.lengthCm ?? 0) * (v.widthCm ?? 0) * (v.heightCm ?? 0),
    });
  }

  const active = lines.filter((l) => !l.savedForLater);
  const subtotalForCoupon = computeTotals(lines, null).subtotal;
  let couponResult = null;
  let coupon: CartView["coupon"] = null;
  if (cart.coupon) {
    // دفعات استفاده‌ی همین مشتری (سفارش‌های لغونشده) — مهمان هنگام تسویه وارد می‌شود و دوباره سنجیده می‌شود
    const customerUses = cart.userId
      ? await db.order.count({
          where: {
            userId: cart.userId,
            couponId: cart.coupon.id,
            status: { notIn: ["CANCELLED", "PENDING_PAYMENT"] },
          },
        })
      : 0;
    const r = evaluateCoupon(cart.coupon, subtotalForCoupon, new Date(), customerUses);
    couponResult = r;
    coupon = r.ok
      ? { code: cart.coupon.code }
      : { code: cart.coupon.code, error: fa.cart.couponErrors[r.reason] };
  }
  const bundle = bundleDiscount(lines.filter(countable), await activeBundleRules());
  const totals = computeTotals(lines, couponResult, undefined, bundle.total);

  // پیشنهاد مکمل بر اساس قوانین مدیر (FR-REC-02 بخش قوانین)
  const productIds = active.map((l) => l.productId);
  let recommendations: CartView["recommendations"] = [];
  if (productIds.length) {
    const rules = await db.recommendationRule.findMany({
      where: { isActive: true, sourceProductId: { in: productIds } },
    });
    const targets = await getProductSummaries([...new Set(rules.map((r) => r.targetProductId))]);
    const candidates = new Map<string, Candidate>(
      targets
        .filter((t) => t.defaultVariantId)
        .map((t) => [
          t.id,
          {
            productId: t.id,
            slug: t.slug,
            name: t.name,
            icon: t.icon,
            variantId: t.defaultVariantId!,
            price: t.price,
            inStock: t.stock !== "out",
          },
        ]),
    );
    recommendations = pickRecommendations({
      cartProductIds: lines.map((l) => l.productId),
      rules,
      candidates,
      freeShippingGap: totals.freeShippingGap,
      max: STORE.maxRecommendations,
      defaultReason: fa.cart.defaultReason,
    });
  }

  return {
    lines: active,
    saved: lines.filter((l) => l.savedForLater),
    coupon,
    totals,
    notices,
    recommendations,
  };
}

/** سبد جاری؛ در هر درخواست یک بار ساخته می‌شود (cache) تا هدر و صفحه یک نسخه ببینند. */
export const getCart = cache(async (): Promise<CartView> => {
  const id = await getCartId();
  if (!id) return EMPTY_CART;
  try {
    return await buildView(id);
  } catch (e) {
    console.error("getCart failed", e);
    return EMPTY_CART;
  }
});

export { buildView as buildCartView };
