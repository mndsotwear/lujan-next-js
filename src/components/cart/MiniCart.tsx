"use client";
/** پنل سبد از پایین — فقط موبایل و تبلت (FR-CART-01). دسکتاپ پنجره‌ی کوچک زیر دکمه‌ی سبد دارد (CartButton). */
import Link from "next/link";
import { useEffect, useRef } from "react";
import { fa } from "@/content/fa";
import { Icon } from "../Icon";
import { CartLineItem } from "./CartLineItem";
import { useCart } from "./CartProvider";
import { CartRecs } from "./CartRecs";
import { CartSummary } from "./CartSummary";
import { ShipProgress } from "./ShipProgress";

export function MiniCart() {
  const { view, open, setOpen, message } = useCart();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    // در دسکتاپ این پنل نمایش داده نمی‌شود
    if (window.matchMedia("(min-width: 1024px)").matches) return setOpen(false);
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, setOpen]);

  if (!open) return null;
  const close = () => setOpen(false);
  return (
    <div
      className="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={fa.cart.title}
    >
      <button
        type="button"
        aria-label={fa.cart.close}
        onClick={close}
        className="absolute inset-0 bg-black/45"
      />
      <div className="rounded-t-sheet bg-surface shadow-sheet absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col">
        <div className="border-line flex items-center justify-between border-b px-5 py-4">
          <b className="text-lg">
            {fa.cart.title}{" "}
            <small className="text-steel text-sm font-normal">
              {view.totals.itemCount > 0 && fa.cart.items(view.totals.itemCount)}
            </small>
          </b>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label={fa.cart.close}
            className="grid size-11 place-items-center"
          >
            <Icon name="close" className="size-[22px]" />
          </button>
        </div>
        {message && (
          <p role="status" className={`px-5 pt-3 text-sm ${message.ok ? "text-ok" : "text-bad"}`}>
            {message.text}
          </p>
        )}
        <div className="flex-1 overflow-auto">
          {view.lines.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p>{fa.cart.empty}</p>
              <Link
                href="/categories/instant-coffee"
                onClick={close}
                className="rounded-ctl border-ink mt-4 inline-grid min-h-11 place-items-center border-[1.5px] px-4 text-sm font-bold"
              >
                {fa.cart.emptyCta}
              </Link>
            </div>
          ) : (
            <>
              <div className="divide-line divide-y">
                {view.lines.map((l) => (
                  <CartLineItem key={l.id} line={l} compact />
                ))}
              </div>
              <ShipProgress totals={view.totals} className="px-5 pb-4" />
              <CartRecs recs={view.recommendations} />
            </>
          )}
        </div>
        {view.lines.length > 0 && (
          <div className="border-line border-t px-5 py-4">
            <CartSummary withCoupon={false} />
            <Link
              href="/checkout"
              onClick={close}
              className="rounded-ctl bg-copper text-copper-ink mt-3 grid min-h-12 place-items-center font-bold"
            >
              {fa.cart.checkout}
            </Link>
            <Link
              href="/cart"
              onClick={close}
              className="text-ink-2 mt-1 grid min-h-10 place-items-center text-sm"
            >
              {fa.cart.viewCart}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
