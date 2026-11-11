"use client";
import Link from "next/link";
import { fa } from "@/content/fa";
import { useCart } from "./CartProvider";
import { CartLineItem } from "./CartLineItem";
import { CartNotices } from "./CartNotices";
import { CartRecs } from "./CartRecs";
import { CartSummary } from "./CartSummary";
import { ShipProgress } from "./ShipProgress";
import { Icon } from "../Icon";

/** صفحه‌ی کامل سبد (FR-CART-01) */
export function CartPageView() {
  const { view } = useCart();
  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-24 lg:pb-8">
      <h1 className="my-6 text-2xl font-bold">
        {fa.cart.title}{" "}
        {view.totals.itemCount > 0 && (
          <small className="text-steel text-sm font-normal">
            ({fa.cart.items(view.totals.itemCount)})
          </small>
        )}
      </h1>
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <CartNotices notices={view.notices} />
          {view.lines.length === 0 ? (
            <div className="rounded-card border-line bg-surface border p-10 text-center">
              <p>{fa.cart.empty}</p>
              <Link
                href="/categories/instant-coffee"
                className="rounded-ctl border-ink mt-4 inline-grid min-h-11 place-items-center border-[1.5px] px-4 text-sm font-bold"
              >
                {fa.cart.emptyCta}
              </Link>
            </div>
          ) : (
            <div className="rounded-card border-line bg-surface overflow-hidden border">
              <div className="divide-line divide-y">
                {view.lines.map((l) => (
                  <CartLineItem key={l.id} line={l} />
                ))}
              </div>
              <ShipProgress totals={view.totals} className="px-5 py-4" />
              <CartRecs recs={view.recommendations} />
            </div>
          )}
          {view.saved.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold">{fa.cart.savedTitle(view.saved.length)}</h2>
              <div className="divide-line rounded-card border-line bg-surface divide-y overflow-hidden border">
                {view.saved.map((l) => (
                  <CartLineItem key={l.id} line={l} />
                ))}
              </div>
            </section>
          )}
        </div>
        {view.lines.length > 0 && (
          <aside className="rounded-card border-line bg-surface border p-5 lg:sticky lg:top-[120px]">
            <CartSummary />
            <Link
              href="/checkout"
              className="rounded-ctl bg-copper text-copper-ink mt-4 grid min-h-12 place-items-center font-bold"
            >
              {fa.cart.checkout}
            </Link>
            <ul className="mt-4 grid gap-2 text-sm">
              <li className="flex gap-2">
                <Icon name="shield" className="text-copper size-5" />
                {fa.product.returns}
              </li>
            </ul>
          </aside>
        )}
      </div>
    </main>
  );
}
