"use client";
import Link from "next/link";
import { fa } from "@/content/fa";
import { formatNumber } from "@/lib/format";
import type { CartLine } from "@/modules/cart";
import { Icon } from "../Icon";
import { StockBadge } from "../StockBadge";
import { useCart } from "./CartProvider";
import { QtyStepper } from "./QtyStepper";

export function CartLineItem({ line, compact = false }: { line: CartLine; compact?: boolean }) {
  const { setQty, remove, saveForLater } = useCart();
  const size = compact ? "size-14" : "size-24 max-sm:size-[72px]";
  return (
    <div className="grid grid-cols-[auto_1fr_auto] gap-3 px-5 py-4 max-sm:px-4">
      <Link
        href={`/products/${line.slug}`}
        className={`grid ${size} rounded-ctl bg-surface-2 text-steel place-items-center`}
        tabIndex={-1}
        aria-hidden
      >
        <Icon name={line.icon} className="w-3/4" />
      </Link>
      <div className="min-w-0">
        <Link
          href={`/products/${line.slug}`}
          className="hover:text-copper block text-sm font-medium"
        >
          {line.name}
        </Link>
        {line.variantLabel && <span className="text-steel text-xs">{line.variantLabel}</span>}
        {line.stock !== "in_stock" && (
          <div className="mt-1">
            <StockBadge stock={line.stock} available={line.available} />
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {line.savedForLater ? (
            <button
              type="button"
              onClick={() => saveForLater(line.id, false)}
              className="rounded-ctl border-ink min-h-8 border-[1.5px] px-3 text-sm"
            >
              {fa.cart.moveToCart}
            </button>
          ) : (
            <QtyStepper
              value={line.quantity}
              max={Math.min(line.available, 20)}
              onChange={(n) => setQty(line.id, n)}
            />
          )}
          {!compact && !line.savedForLater && (
            <button
              type="button"
              onClick={() => saveForLater(line.id, true)}
              className="text-ink-2 py-1.5 text-xs underline underline-offset-4"
            >
              {fa.cart.saveForLater}
            </button>
          )}
          <button
            type="button"
            onClick={() => remove(line.id)}
            className="text-ink-2 py-1.5 text-xs underline underline-offset-4"
          >
            {fa.cart.remove}
          </button>
        </div>
      </div>
      <div className="text-end whitespace-nowrap">
        <b className={compact ? "text-sm" : "text-lg"}>
          {formatNumber(line.unitPrice * line.quantity)}
        </b>
        {line.quantity > 1 && (
          <small className="text-steel block text-xs">
            {fa.cart.unitPrice(formatNumber(line.unitPrice), line.quantity)}
          </small>
        )}
        {line.oldUnitPrice && (
          <s className="text-steel block text-xs">
            {formatNumber(line.oldUnitPrice * line.quantity)}
          </s>
        )}
      </div>
    </div>
  );
}
