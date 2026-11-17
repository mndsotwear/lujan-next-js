"use client";
/**
 * دکمه‌ی سبد در سربرگ.
 * دسکتاپ: مثل دیجی‌کالا با نگه داشتن موس (یا فوکوس صفحه‌کلید) پنجره‌ی کوچک سبد زیر دکمه باز می‌شود؛
 * کلیک = صفحه‌ی سبد. موبایل: پنل سبد از پایین (MiniCart).
 */
import Link from "next/link";
import { fa } from "@/content/fa";
import { formatNumber } from "@/lib/format";
import { Icon } from "../Icon";
import { CartLineItem } from "./CartLineItem";
import { useCart } from "./CartProvider";

const btnCls =
  "bg-copper text-copper-ink relative flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-bold whitespace-nowrap hover:brightness-110 lg:px-4";

function Count({ n }: { n: number }) {
  return n > 0 ? (
    <span className="bg-copper-ink text-copper grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px]">
      {formatNumber(n)}
    </span>
  ) : null;
}

/** پنجره‌ی کوچک سبد زیر دکمه (فقط دسکتاپ) */
function CartDropdown() {
  const { view } = useCart();
  const n = view.totals.itemCount;
  return (
    <div className="invisible absolute end-0 top-full z-50 pt-2 opacity-0 transition-[opacity,visibility] duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 max-lg:hidden">
      <div
        role="region"
        aria-label={fa.cart.title}
        className="rounded-card border-line bg-surface text-ink w-[400px] overflow-hidden border shadow-[0_18px_48px_-18px_rgb(15_27_45/0.45)]"
      >
        {view.lines.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <Icon name="cart" className="text-steel mx-auto mb-3 size-10" />
            <p className="text-sm">{fa.cart.empty}</p>
          </div>
        ) : (
          <>
            <div className="border-line flex items-center justify-between border-b px-5 py-3 text-sm">
              <span className="text-ink-2">{fa.cart.items(n)}</span>
              <Link href="/cart" className="text-copper flex items-center gap-1 font-bold">
                {fa.cart.viewCartShort}
                <Icon name="chevron" className="size-4" />
              </Link>
            </div>
            <div className="divide-line max-h-[min(52vh,420px)] divide-y overflow-y-auto overscroll-contain">
              {view.lines.map((l) => (
                <CartLineItem key={l.id} line={l} compact />
              ))}
            </div>
            <div className="border-line bg-surface-2/60 flex items-center justify-between gap-4 border-t px-5 py-4">
              <div className="text-sm">
                <span className="text-ink-2 block text-xs">{fa.cart.payable}</span>
                <b className="text-base">
                  {formatNumber(view.totals.total)}{" "}
                  <small className="text-ink-2 font-normal">{fa.units.toman}</small>
                </b>
              </div>
              <Link
                href="/checkout"
                className="rounded-ctl bg-copper text-copper-ink grid min-h-11 place-items-center px-6 text-sm font-bold hover:brightness-110"
              >
                {fa.cart.placeOrder}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function CartButton() {
  const { view, setOpen } = useCart();
  const n = view.totals.itemCount;
  const label = `${fa.cart.open}${n ? ` (${fa.cart.items(n)})` : ""}`;
  return (
    <div className="group relative">
      {/* موبایل و تبلت: پنل از پایین */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        className={`${btnCls} lg:hidden`}
      >
        <Icon name="cart" className="size-5" />
        <Count n={n} />
      </button>
      {/* دسکتاپ: کلیک = صفحه‌ی سبد؛ نگه داشتن موس = پنجره‌ی کوچک */}
      <Link href="/cart" aria-label={label} className={`${btnCls} max-lg:hidden`}>
        <Icon name="cart" className="size-5" />
        <span>{fa.nav.cartButton}</span>
        <Count n={n} />
      </Link>
      <CartDropdown />
    </div>
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
