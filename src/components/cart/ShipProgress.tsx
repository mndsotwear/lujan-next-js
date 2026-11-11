import { STORE } from "@/config/store";
import { fa } from "@/content/fa";
import { formatNumber } from "@/lib/format";
import type { CartTotals } from "@/modules/cart";

/** نوار پیشرفت ارسال رایگان روی خط‌کش امضای برند (FR-CART-05، D-007) */
export function ShipProgress({
  totals,
  className = "",
}: {
  totals: CartTotals;
  className?: string;
}) {
  const threshold = STORE.freeShippingThreshold;
  if (threshold === null) return null; // D-018: ارسال رایگان نداریم
  const pct = totals.freeShipping ? 100 : Math.min(100, (totals.total / threshold) * 100);
  return (
    <div className={className}>
      <p className="mb-1.5 text-sm">
        {totals.freeShipping
          ? fa.cart.freeReached
          : fa.cart.freeGap(formatNumber(totals.freeShippingGap))}
      </p>
      <div
        className="relative h-3.5"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label={fa.cart.freeReached}
      >
        <div className="ruler absolute inset-0" aria-hidden />
        <div
          className="bg-copper absolute inset-y-0 start-0 top-2 rounded-sm transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
