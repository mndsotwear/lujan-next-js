"use client";
import { useState } from "react";
import { fa } from "@/content/fa";
import { formatNumber } from "@/lib/format";
import { useCart } from "./CartProvider";

/** جمع کل، کد تخفیف، ارسال و مالیات (FR-CART-04) */
export function CartSummary({ withCoupon = true }: { withCoupon?: boolean }) {
  const { view, applyCoupon, removeCoupon, message } = useCart();
  const t = view.totals;
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const row = (label: string, value: string, tone = "") => (
    <>
      <dt className="text-ink-2">{label}</dt>
      <dd className={`text-end ${tone}`}>{value}</dd>
    </>
  );
  return (
    <div>
      <dl className="grid grid-cols-[1fr_auto] gap-2 text-sm">
        {row(fa.cart.subtotal, `${formatNumber(t.subtotal)} ${fa.units.toman}`)}
        {t.itemSavings > 0 &&
          row(fa.cart.savings, `${formatNumber(t.itemSavings)} ${fa.units.toman}`, "text-ok")}
        {view.coupon &&
          !view.coupon.error &&
          row(
            fa.cart.couponLine(view.coupon.code),
            `− ${formatNumber(t.couponDiscount)} ${fa.units.toman}`,
            "text-ok",
          )}
        {row(fa.cart.shipping, t.freeShipping ? fa.cart.shippingFree : fa.cart.shippingLater)}
        {row(fa.cart.vat, fa.cart.vatIncluded)}
      </dl>
      {withCoupon && (
        <div className="mt-4">
          {view.coupon ? (
            <div className="rounded-ctl bg-surface-2 flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span dir="ltr" className="font-bold">
                {view.coupon.code}
              </span>
              <button type="button" onClick={removeCoupon} className="text-copper text-xs">
                {fa.cart.couponRemove}
              </button>
            </div>
          ) : (
            <form
              className="flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!code.trim()) return;
                setBusy(true);
                if (await applyCoupon(code)) setCode("");
                setBusy(false);
              }}
            >
              <label htmlFor="coupon" className="sr-only">
                {fa.cart.couponPlaceholder}
              </label>
              <input
                id="coupon"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={fa.cart.couponPlaceholder}
                dir="ltr"
                className="rounded-ctl border-line bg-surface focus:border-copper min-h-11 min-w-0 flex-1 border-[1.5px] px-3 text-sm focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-ctl border-ink min-h-11 border-[1.5px] px-4 text-sm disabled:opacity-50"
              >
                {fa.cart.couponApply}
              </button>
            </form>
          )}
          {view.coupon?.error ? (
            <p className="text-bad mt-1.5 text-xs">{view.coupon.error}</p>
          ) : (
            message && (
              <p className={`mt-1.5 text-xs ${message.ok ? "text-ok" : "text-bad"}`}>
                {message.text}
              </p>
            )
          )}
        </div>
      )}
      <div className="border-line mt-4 flex items-baseline justify-between border-t pt-4">
        <span>{fa.cart.payable}</span>
        <strong className="text-xl font-black">
          {formatNumber(t.total)} <small className="text-sm font-normal">{fa.units.toman}</small>
        </strong>
      </div>
    </div>
  );
}
