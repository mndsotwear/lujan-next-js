"use client";
import Link from "next/link";
import { fa } from "@/content/fa";
import { formatNumber } from "@/lib/format";
import type { Recommendation } from "@/modules/cart";
import { Icon } from "../Icon";
import { AddToCartButton } from "./AddToCartButton";

/** پیشنهاد مکمل با برچسب علت و افزودن یک‌کلیکی، بدون خروج از سبد (FR-REC-01, 04, 05, 06) */
export function CartRecs({ recs }: { recs: Recommendation[] }) {
  if (!recs.length) return null;
  return (
    <section aria-label={fa.cart.recsTitle} className="bg-copper-soft px-5 py-4 max-sm:px-4">
      <h3 className="mb-3 text-sm font-bold">{fa.cart.recsTitle}</h3>
      <ul className="grid gap-1">
        {recs.map((r) => (
          <li
            key={r.productId}
            className="grid grid-cols-[44px_1fr_auto] items-center gap-3 py-1.5"
          >
            <span className="rounded-ctl bg-surface text-steel grid size-11 place-items-center">
              <Icon name={r.icon} className="w-3/4" />
            </span>
            <div className="min-w-0 text-sm">
              <Link href={`/products/${r.slug}`} className="hover:text-copper">
                {r.name}
              </Link>
              <small
                className={`block text-xs ${r.unlocksFreeShipping ? "text-copper font-bold" : "text-ink-2"}`}
              >
                {r.unlocksFreeShipping ? fa.cart.unlocksFree : r.reason} · {formatNumber(r.price)}{" "}
                {fa.units.toman}
              </small>
            </div>
            <AddToCartButton
              key={r.variantId}
              variantId={r.variantId}
              name={r.name}
              variant="small"
              openDrawer={false}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
