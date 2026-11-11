"use client";
import { fa } from "@/content/fa";
import { formatNumber } from "@/lib/format";
import type { CartNotice } from "@/modules/cart";
import { Icon } from "../Icon";

/** پیام تغییر قیمت و موجودی (FR-CART-03) */
export function CartNotices({ notices }: { notices: CartNotice[] }) {
  if (!notices.length) return null;
  const text = (n: CartNotice) => {
    const d = formatNumber(n.detail ?? 0);
    switch (n.kind) {
      case "price_up":
        return fa.cart.notices.price_up(n.name, d);
      case "price_down":
        return fa.cart.notices.price_down(n.name, d);
      case "qty_reduced":
        return fa.cart.notices.qty_reduced(n.name, n.detail ?? 0);
      case "out_of_stock":
        return fa.cart.notices.out_of_stock(n.name);
      case "coupon_removed":
        return fa.cart.notices.coupon_removed(n.name);
    }
  };
  return (
    <ul role="status" className="space-y-2">
      {notices.map((n, i) => (
        <li key={i} className="rounded-ctl bg-copper-soft flex items-start gap-3 px-4 py-3 text-sm">
          <Icon name="info" className="text-copper mt-0.5 size-5 shrink-0" />
          {text(n)}
        </li>
      ))}
    </ul>
  );
}
