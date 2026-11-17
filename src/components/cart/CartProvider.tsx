"use client";
/**
 * وضعیت سبد در مرورگر. نسخه‌ی اولیه از سرور می‌آید (layout)؛ هر عملیات Server Action صدا می‌زند و
 * پاسخ تازه را جایگزین می‌کند. تغییر تعداد خوش‌بینانه است (FR-CART-01: بدون بارگذاری مجدد).
 */
import { createContext, useCallback, useContext, useMemo, useState, useTransition } from "react";
import { fa } from "@/content/fa";
import { track } from "@/lib/analytics";
import * as actions from "@/modules/cart/actions";
import type { CartActionResult } from "@/modules/cart/actions";
import { computeTotals, type CartView } from "@/modules/cart";

type Ctx = {
  view: CartView;
  open: boolean;
  setOpen: (v: boolean) => void;
  pending: boolean;
  message: { text: string; ok: boolean } | null;
  /** پیام کوچک پس از افزودن (هر بار شناسه‌ی تازه تا دوباره نمایش داده شود) */
  toast: { id: number; text: string; ok: boolean } | null;
  add: (
    variantId: string,
    qty?: number,
    opts?: { openDrawer?: boolean; name?: string },
  ) => Promise<boolean>;
  setQty: (itemId: string, qty: number) => void;
  remove: (itemId: string) => void;
  saveForLater: (itemId: string, saved: boolean) => void;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
};

const CartCtx = createContext<Ctx | null>(null);

export function useCart(): Ctx {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}

export function CartProvider({
  initial,
  children,
}: {
  initial: CartView;
  children: React.ReactNode;
}) {
  const [view, setView] = useState(initial);
  // وقتی سرور نسخه‌ی تازه می‌فرستد (ورود، خروج، router.refresh)، همان مرجع است
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setView(initial);
  }
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<Ctx["message"]>(null);
  const [toast, setToast] = useState<Ctx["toast"]>(null);

  const run = useCallback(async (p: Promise<CartActionResult>, success?: string) => {
    try {
      const r = await p;
      setView(r.view);
      const text = r.message ?? (r.ok ? success : undefined);
      setMessage(text ? { text, ok: r.ok } : null);
      return r.ok;
    } catch {
      setMessage({ text: fa.cart.errors.network, ok: false });
      return false;
    }
  }, []);

  const optimistic = useCallback(
    (mutate: (v: CartView) => CartView, p: () => Promise<CartActionResult>) => {
      const before = view;
      const next = mutate(view);
      // تا پاسخ سرور، تخفیف کد قبلی حفظ می‌شود تا جمع پرش نکند
      const keep = view.totals.couponDiscount
        ? { ok: true as const, discount: view.totals.couponDiscount, freeShipping: false }
        : null;
      setView({
        ...next,
        totals: computeTotals(
          [...next.lines, ...next.saved],
          keep,
          undefined,
          view.totals.bundleDiscount,
        ),
      });
      start(async () => {
        const ok = await run(p());
        if (!ok) setView((v) => (v === next ? before : v));
      });
    },
    [view, run],
  );

  const value = useMemo<Ctx>(
    () => ({
      view,
      open,
      setOpen,
      pending,
      message,
      toast,
      // پس از افزودن، پنل سبد باز نمی‌شود؛ فقط پیام کوچک (مثل دیجی‌کالا)
      add: async (variantId, qty = 1, opts = {}) => {
        let text: string | undefined;
        let ok = false;
        try {
          const r = await actions.addToCart(variantId, qty);
          setView(r.view);
          ok = r.ok;
          text = r.message ?? (r.ok && opts.name ? fa.cart.added(opts.name) : undefined);
        } catch {
          text = fa.cart.errors.network;
        }
        setMessage(text ? { text, ok } : null);
        if (text) setToast({ id: Date.now(), text, ok });
        if (ok) track("add_to_cart", { qty });
        return ok;
      },
      setQty: (itemId, qty) =>
        optimistic(
          (v) => ({
            ...v,
            lines:
              qty <= 0
                ? v.lines.filter((l) => l.id !== itemId)
                : v.lines.map((l) => (l.id === itemId ? { ...l, quantity: qty } : l)),
          }),
          () => actions.setQuantity(itemId, qty),
        ),
      remove: (itemId) =>
        optimistic(
          (v) => ({
            ...v,
            lines: v.lines.filter((l) => l.id !== itemId),
            saved: v.saved.filter((l) => l.id !== itemId),
          }),
          () => actions.removeItem(itemId),
        ),
      saveForLater: (itemId, saved) =>
        optimistic(
          (v) => {
            const all = [...v.lines, ...v.saved].map((l) =>
              l.id === itemId ? { ...l, savedForLater: saved } : l,
            );
            return {
              ...v,
              lines: all.filter((l) => !l.savedForLater),
              saved: all.filter((l) => l.savedForLater),
            };
          },
          () => actions.setSavedForLater(itemId, saved),
        ),
      applyCoupon: (code) => run(actions.applyCoupon(code)),
      removeCoupon: () => void run(actions.removeCoupon()),
    }),
    [view, open, pending, message, toast, run, optimistic],
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}
