"use client";
/**
 * تسویه حساب تک‌صفحه‌ای (FR-CHK-01): موبایل ← آدرس ← روش ارسال ← پرداخت (طرح M0.4).
 * قواعد روش ارسال و پرداخت در محل همان rules.ts سرور است؛ سرور دوباره همه را بررسی می‌کند.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { STORE } from "@/config/store";
import { fa } from "@/content/fa";
import { track } from "@/lib/analytics";
import { formatNumber } from "@/lib/format";
import { formatMobile } from "@/modules/account";
import {
  chargeableKg,
  codAllowed,
  parcelOf,
  SHIPPING_METHODS,
  shippingOptions,
  type PaymentMethod,
  type ShippingMethod,
} from "@/modules/checkout";
import { placeOrder } from "@/modules/checkout/actions";
import { AddressBook } from "../account/AddressBook";
import { useCart } from "../cart/CartProvider";
import { Icon } from "../Icon";

type Address = {
  id: string;
  title: string | null;
  province: string;
  city: string;
  postalCode: string;
  line: string;
  recipient: string;
  phone: string;
  isDefault: boolean;
};

function Step({
  n,
  title,
  done,
  summary,
  children,
}: {
  n: number;
  title: string;
  done?: boolean;
  summary?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-card border-line bg-surface border">
      <header className="flex items-center gap-3 px-5 py-4">
        <span
          className={`grid size-7 shrink-0 place-items-center rounded-full border-[1.5px] text-sm font-bold ${done ? "border-ok bg-ok text-white" : "border-ink bg-ink text-bg"}`}
        >
          {done ? <Icon name="check" className="size-4" /> : n.toLocaleString("fa-IR")}
        </span>
        <h2 className="flex-1 font-bold">{title}</h2>
        {summary && <span className="text-ink-2 text-sm">{summary}</span>}
      </header>
      {children && <div className="px-5 pb-5">{children}</div>}
    </section>
  );
}

function Choice({
  name,
  checked,
  onChange,
  disabled,
  title,
  hint,
  price,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  title: string;
  hint?: string;
  price?: string;
}) {
  return (
    <label
      className={`rounded-ctl grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 border-[1.5px] px-4 py-3 ${checked ? "border-ink bg-surface-2/50" : "border-line"} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="accent-copper size-[18px]"
      />
      <span>
        <b className="text-sm">{title}</b>
        {hint && <small className="text-steel block text-xs">{hint}</small>}
      </span>
      {price && <span className="text-sm font-bold whitespace-nowrap">{price}</span>}
    </label>
  );
}

export function CheckoutView({
  mobile,
  addresses,
  hasInvoiceInfo,
}: {
  mobile: string;
  addresses: Address[];
  hasInvoiceInfo: boolean;
}) {
  const router = useRouter();
  const { view } = useCart();
  const def = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [addressId, setAddressId] = useState<string | null>(def?.id ?? null);
  const [method, setMethod] = useState<ShippingMethod | null>(null);
  const [pay, setPay] = useState<PaymentMethod>("ONLINE");
  const [official, setOfficial] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // آمار: شروع تسویه یک‌بار در هر بار باز شدن صفحه (D-054)
  const total = view.totals.total;
  useEffect(() => {
    track("begin_checkout", { value: total });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- فقط هنگام باز شدن
  }, []);

  // آدرس تازه‌ساخته‌شده (یا پیش‌فرض) خودکار انتخاب می‌شود
  const address = addresses.find((a) => a.id === (addressId ?? def?.id)) ?? def ?? null;
  const parcel = useMemo(() => parcelOf(view.lines), [view.lines]);
  const options = useMemo(() => shippingOptions(address, parcel), [address, parcel]);
  const quoteOf = (m: ShippingMethod) => options.find((o) => o.method === m)!;
  const chosen = method && quoteOf(method).available ? method : null;
  const shipCost = chosen ? (view.totals.freeShipping ? 0 : quoteOf(chosen).cost) : 0;
  const grand = view.totals.total + shipCost;
  const cod = chosen
    ? codAllowed(chosen, chosen === "PICKUP" ? null : (address?.city ?? null), grand)
    : false;
  const payMethod: PaymentMethod = pay === "COD" && !cod ? "ONLINE" : pay;

  if (!view.lines.length)
    return (
      <div className="rounded-card border-line bg-surface border p-10 text-center">
        <p>{fa.checkout.emptyCart}</p>
        <Link
          href="/categories/instant-coffee"
          className="rounded-ctl border-ink mt-4 inline-grid min-h-11 place-items-center border-[1.5px] px-4 text-sm font-bold"
        >
          {fa.cart.emptyCta}
        </Link>
      </div>
    );

  const submit = async () => {
    if (!chosen) return setError(fa.checkout.chooseShipping);
    if (!agree) return setError(fa.checkout.errors.agree);
    setBusy(true);
    setError(null);
    const r = await placeOrder({
      addressId: chosen === "PICKUP" ? null : (address?.id ?? null),
      shippingMethod: chosen,
      paymentMethod: payMethod,
      officialInvoice: official,
    }).catch(() => ({ ok: false as const, message: fa.cart.errors.network, refresh: false }));
    if (r.ok) {
      // درگاه آزمایشی در همین سایت است؛ درگاه واقعی آدرس بیرونی دارد
      if (r.redirect.startsWith("/")) router.push(r.redirect);
      else window.location.href = r.redirect;
      return;
    }
    setBusy(false);
    setError(r.message);
    if (r.refresh) router.refresh();
  };

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Step n={1} title={fa.checkout.steps.contact} done summary={formatMobile(mobile)} />
        <Step
          n={2}
          title={fa.checkout.steps.address}
          done={!!address || chosen === "PICKUP"}
          summary={
            address && chosen !== "PICKUP" ? `${address.city}، ${address.recipient}` : undefined
          }
        >
          {chosen === "PICKUP" ? (
            <p className="text-ink-2 text-sm">{fa.checkout.pickupNoAddress}</p>
          ) : (
            <div className="space-y-3">
              {addresses.map((a) => (
                <Choice
                  key={a.id}
                  name="address"
                  checked={a.id === address?.id}
                  onChange={() => setAddressId(a.id)}
                  title={a.title ?? a.city}
                  hint={`${a.province}، ${a.city}، ${a.line} — ${a.recipient}`}
                />
              ))}
              <details open={!addresses.length}>
                <summary className="text-copper cursor-pointer py-2 text-sm font-medium">
                  {fa.account.addAddress}
                </summary>
                <div className="pt-2">
                  <AddressBook addresses={[]} startNew />
                </div>
              </details>
            </div>
          )}
        </Step>
        <Step n={3} title={fa.checkout.steps.shipping} done={!!chosen}>
          <div className="space-y-3">
            {SHIPPING_METHODS.map((m) => {
              const o = quoteOf(m);
              const why = o.reason;
              return (
                <Choice
                  key={m}
                  name="ship"
                  checked={chosen === m}
                  disabled={!o.available}
                  onChange={() => setMethod(m)}
                  title={
                    m === "PICKUP"
                      ? fa.checkout.pickupAt(STORE.storeLocation.city)
                      : fa.checkout.methods[m]
                  }
                  hint={
                    !why
                      ? o.eta
                      : why === "courier_city"
                        ? fa.checkout.unavailable.courier_city(STORE.storeLocation.city)
                        : fa.checkout.unavailable[why]
                  }
                  price={
                    !o.available
                      ? undefined
                      : o.cost === 0 || view.totals.freeShipping
                        ? fa.checkout.free
                        : formatNumber(o.cost)
                  }
                />
              );
            })}
            <p className="text-steel text-xs">
              {fa.checkout.weightNote(chargeableKg(parcel).toLocaleString("fa-IR"))}
            </p>
          </div>
        </Step>
        <Step n={4} title={fa.checkout.steps.payment}>
          <div className="space-y-3">
            <Choice
              name="pay"
              checked={payMethod === "ONLINE"}
              onChange={() => setPay("ONLINE")}
              title={fa.checkout.pay.ONLINE}
              hint={fa.checkout.payHint.ONLINE}
            />
            <Choice
              name="pay"
              checked={payMethod === "COD"}
              disabled={!cod}
              onChange={() => setPay("COD")}
              title={fa.checkout.pay.COD}
              hint={
                cod
                  ? fa.checkout.payHint.COD(
                      STORE.storeLocation.city,
                      formatNumber(STORE.cod.maxTotal),
                    )
                  : fa.checkout.codUnavailable
              }
            />
            <label className="rounded-ctl border-line flex items-start gap-3 border-[1.5px] px-4 py-3">
              <input
                type="checkbox"
                checked={official}
                onChange={(e) => setOfficial(e.target.checked)}
                className="accent-copper mt-1 size-[18px]"
              />
              <span className="text-sm">
                <b>{fa.checkout.officialInvoice}</b>
                <small className="text-steel block text-xs">
                  {official && !hasInvoiceInfo ? (
                    <Link href="/account/profile" className="text-bad underline">
                      {fa.checkout.officialMissing}
                    </Link>
                  ) : (
                    fa.checkout.officialHint
                  )}
                </small>
              </span>
            </label>
            <label className="text-ink-2 flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="accent-copper size-4"
              />
              {fa.checkout.agree}
            </label>
            <p className="text-ink-2 text-xs">
              {fa.checkout.returnsNote}{" "}
              <Link href="/returns" target="_blank" className="text-copper underline">
                {fa.checkout.returnsLink}
              </Link>
            </p>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy}
              className="rounded-ctl bg-copper text-copper-ink min-h-12 w-full font-bold disabled:opacity-60"
            >
              {busy
                ? fa.checkout.placing
                : payMethod === "ONLINE"
                  ? fa.checkout.payBtn(formatNumber(grand))
                  : fa.checkout.placeBtn}
            </button>
            <p role="alert" className="text-bad min-h-5 text-sm">
              {error ?? ""}
            </p>
            {payMethod === "ONLINE" && (
              <p className="text-steel text-center text-xs">
                {fa.checkout.reserveNote(STORE.reservationMinutes)}
              </p>
            )}
          </div>
        </Step>
      </div>
      <aside className="rounded-card border-line bg-surface border p-5 max-lg:order-first lg:sticky lg:top-[120px]">
        <h2 className="mb-3 font-bold">{fa.checkout.summary}</h2>
        <ul className="mb-3 space-y-2 text-sm">
          {view.lines.map((l) => (
            <li key={l.id} className="flex justify-between gap-2">
              <span className="min-w-0">
                {l.name}{" "}
                {l.quantity > 1 && (
                  <small className="text-steel">× {formatNumber(l.quantity)}</small>
                )}
              </span>
              <b className="whitespace-nowrap">{formatNumber(l.unitPrice * l.quantity)}</b>
            </li>
          ))}
        </ul>
        <dl className="border-line grid grid-cols-[1fr_auto] gap-2 border-t pt-3 text-sm">
          <dt className="text-ink-2">{fa.cart.subtotal}</dt>
          <dd>{formatNumber(view.totals.subtotal)}</dd>
          {view.totals.couponDiscount > 0 && (
            <>
              <dt className="text-ink-2">{fa.cart.couponLine(view.coupon?.code ?? "")}</dt>
              <dd className="text-ok">− {formatNumber(view.totals.couponDiscount)}</dd>
            </>
          )}
          <dt className="text-ink-2">{fa.checkout.shippingLine}</dt>
          <dd>{chosen ? (shipCost ? formatNumber(shipCost) : fa.checkout.free) : "—"}</dd>
        </dl>
        <div className="border-line mt-3 flex items-baseline justify-between border-t pt-3">
          <span>{fa.cart.payable}</span>
          <strong className="text-xl font-black">
            {formatNumber(grand)} <small className="text-sm font-normal">{fa.units.toman}</small>
          </strong>
        </div>
      </aside>
    </div>
  );
}
