"use client";
import { fa } from "@/content/fa";
import { formatNumber } from "@/lib/format";
import { Icon } from "../Icon";
import { useCart } from "./CartProvider";

export function CartButton() {
  const { view, setOpen } = useCart();
  const n = view.totals.itemCount;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={`${fa.cart.open}${n ? ` (${fa.cart.items(n)})` : ""}`}
      className="bg-copper text-copper-ink relative flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-bold whitespace-nowrap hover:brightness-110 lg:px-4"
    >
      <Icon name="cart" className="size-5" />
      <span className="max-lg:sr-only">{fa.nav.cartButton}</span>
      {n > 0 && (
        <span className="bg-copper-ink text-copper grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px]">
          {formatNumber(n)}
        </span>
      )}
    </button>
  );
}

export function CartCountBadge() {
  const { view } = useCart();
  const n = view.totals.itemCount;
  return n > 0 ? (
    <span className="bg-copper text-copper-ink absolute end-[22%] top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px]">
      {formatNumber(n)}
    </span>
  ) : null;
}
