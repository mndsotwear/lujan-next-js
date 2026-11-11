import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  NoteForm,
  RefundForm,
  StatusActions,
  TrackingForm,
} from "@/components/admin/OrderControls";
import { StatusChip } from "@/components/admin/StatusChip";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { fa } from "@/content/fa";
import { formatNumber, formatOrderNumber } from "@/lib/format";
import { formatMobile, groupIban } from "@/modules/account";
import { openIban } from "@/modules/account/server";
import { can } from "@/modules/admin";
import { requireStaff } from "@/modules/admin/server";
import {
  carrierTrackingPage,
  chargeableKg,
  needsTrackingCode,
  operatorNextStatuses,
  refundableAmount,
} from "@/modules/checkout";
import { getOrderAdmin } from "@/modules/checkout/server";

export const metadata: Metadata = { title: fa.admin.orders.title };

const date = (d: Date) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium", timeStyle: "short" }).format(
    d,
  );

/** جزئیات سفارش در پنل (FR-ADM-04) */
export default async function AdminOrderPage({ params }: { params: Promise<{ number: string }> }) {
  const me = await requireStaff("orders.view");
  const { number } = await params;
  const o = /^\d{1,9}$/.test(number) ? await getOrderAdmin(Number(number)) : null;
  if (!o) notFound();
  const t = fa.admin.orders;
  const manage = can(me.role, "orders.manage");
  const addr = o.shippingAddress as {
    province: string;
    city: string;
    line: string;
    postalCode: string;
    recipient: string;
    phone: string;
  } | null;
  const grams = o.items.reduce((s, i) => s + i.variant.weightGrams * i.quantity, 0) + 300;
  const refundable = refundableAmount(o.payments, o.refunds);
  const box = "rounded-card border-line bg-surface border p-5";
  return (
    <div className="space-y-5">
      <Link href="/admin/orders" className="text-ink-2 text-sm underline">
        {t.back}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          {fa.checkout.order.title(formatOrderNumber(o.number))}
        </h1>
        <div className="flex items-center gap-3">
          <StatusChip status={o.status} />
          {o.status !== "PENDING_PAYMENT" && o.status !== "CANCELLED" && (
            <Link href={`/admin/orders/${o.number}/invoice`} className="text-sm underline">
              {t.invoice}
            </Link>
          )}
          {o.shippingMethod !== "PICKUP" && o.status !== "PENDING_PAYMENT" && (
            <Link href={`/admin/orders/${o.number}/label`} className="text-sm underline">
              {t.label}
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {manage && (
            <section className={box}>
              <h2 className="mb-3 font-bold">{t.actions}</h2>
              <StatusActions
                number={o.number}
                next={operatorNextStatuses(o)}
                needsCode={needsTrackingCode(o.shippingMethod)}
                canCancel={can(me.role, "orders.cancel")}
                pending={
                  o.cancelRequestedAt
                    ? { reason: o.cancelReason ?? "", by: o.cancelRequester ?? "—" }
                    : null
                }
              />
            </section>
          )}
          <section className={box}>
            <h2 className="mb-2 font-bold">{t.items}</h2>
            <OrderSummary o={o} />
            <p className="text-steel mt-2 text-xs">
              {t.weight(chargeableKg({ grams, volumeCm3: 0 }).toLocaleString("fa-IR"))}
            </p>
          </section>
          {o.shippingMethod !== "PICKUP" && (
            <section className={box}>
              <h2 className="mb-3 font-bold">{t.shipments}</h2>
              {o.shipments.length ? (
                <ul className="mb-3 space-y-1 text-sm">
                  {o.shipments.map((s) => {
                    const page = carrierTrackingPage(s.carrier);
                    return (
                      <li key={s.id} className="flex flex-wrap gap-x-3">
                        <span>{fa.checkout.methods[s.carrier]}</span>
                        <b dir="ltr">{s.trackingCode ?? "—"}</b>
                        <span className="text-ink-2">{date(s.createdAt)}</span>
                        {page && s.trackingCode && (
                          <a
                            href={page}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-copper underline"
                          >
                            {fa.track.carrierPage}
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-ink-2 mb-3 text-sm">{t.noShipments}</p>
              )}
              {manage && o.status === "SHIPPED" && <TrackingForm number={o.number} />}
            </section>
          )}
          <section className={box}>
            <h2 className="mb-3 font-bold">{t.payments}</h2>
            <ul className="space-y-1 text-sm">
              {o.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap gap-x-3">
                  <span>{p.gateway === "cod" ? fa.checkout.pay.COD : fa.checkout.pay.ONLINE}</span>
                  <span>{formatNumber(p.amount)}</span>
                  <span className={p.status === "SUCCESS" ? "text-ok" : "text-ink-2"}>
                    {t.paymentStatus[p.status]}
                  </span>
                  {p.refId && (
                    <span dir="ltr" className="text-ink-2">
                      {p.refId}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {o.refunds.length > 0 && (
              <>
                <h3 className="mt-4 mb-1 text-sm font-bold">{t.refunds}</h3>
                <ul className="space-y-1 text-sm">
                  {o.refunds.map((r) => (
                    <li key={r.id} className="flex flex-wrap gap-x-3">
                      <span>− {formatNumber(r.amount)}</span>
                      <span dir="ltr">{r.reference}</span>
                      <span className="text-ink-2">{date(r.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {manage && refundable > 0 && (o.status === "CANCELLED" || o.status === "RETURNED") && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium">{t.refundable(formatNumber(refundable))}</p>
                <p className="bg-surface-2 rounded-ctl mb-3 p-2 text-sm">
                  {t.iban}:{" "}
                  {o.user.refundIban ? (
                    <b dir="ltr" className="font-mono select-all">
                      {groupIban(openIban(o.user.refundIban) ?? "")}
                    </b>
                  ) : (
                    <span className="text-bad">{t.noIban}</span>
                  )}
                </p>
                <RefundForm number={o.number} max={refundable} suggested={refundable} />
              </div>
            )}
          </section>
          <section className={box}>
            <h2 className="mb-3 font-bold">{t.history}</h2>
            <ol className="space-y-2 text-sm">
              <li className="flex gap-3">
                <span className="text-ink-2 w-40 shrink-0">{date(o.createdAt)}</span>
                <span>{t.created}</span>
              </li>
              {o.history.map((h) => {
                const d = (h.diff ?? {}) as {
                  from?: string;
                  to?: string;
                  trackingCode?: string;
                  amount?: number;
                };
                return (
                  <li key={h.id} className="flex gap-3">
                    <span className="text-ink-2 w-40 shrink-0">{date(h.createdAt)}</span>
                    <span>
                      {fa.admin.audit.actions[h.action] ?? h.action}
                      {d.to
                        ? `: ${fa.checkout.status[d.to as keyof typeof fa.checkout.status] ?? d.to}`
                        : ""}
                      {d.trackingCode ? ` (${d.trackingCode})` : ""}
                      {d.amount ? ` — ${formatNumber(d.amount)}` : ""}
                      <small className="text-steel ms-2">
                        {h.actor ? (h.actor.name ?? formatMobile(h.actor.mobile)) : ""}
                      </small>
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <aside className="space-y-5">
          <section className={box}>
            <h2 className="mb-2 font-bold">{t.customer}</h2>
            <p>{o.user.name ?? "—"}</p>
            <p className="text-ink-2 text-sm">{formatMobile(o.user.mobile)}</p>
            <p className="text-ink-2 text-sm">{t.ordersCount(o.user._count.orders)}</p>
          </section>
          <section className={`${box} text-sm`}>
            <h2 className="mb-2 font-bold">{fa.checkout.steps.shipping}</h2>
            <p>{fa.checkout.methods[o.shippingMethod]}</p>
            {o.pickupCode && (
              <p>
                {fa.checkout.result.pickupCode}: <b>{o.pickupCode}</b>
              </p>
            )}
            {addr && (
              <p className="text-ink-2 mt-2 leading-7">
                {addr.recipient} — {formatMobile(addr.phone)}
                <br />
                {addr.province}، {addr.city}، {addr.line}
                <br />
                {fa.account.fields.postalCode}: {addr.postalCode}
              </p>
            )}
            <p className="mt-2">
              {fa.checkout.order.payment}: {fa.checkout.pay[o.paymentMethod]}
            </p>
            {o.officialInvoice && <p className="text-copper">{fa.checkout.officialInvoice}</p>}
          </section>
          {o.returns.length > 0 && (
            <section className={`${box} text-sm`}>
              <h2 className="mb-2 font-bold">{t.returnsLink}</h2>
              <ul className="space-y-1">
                {o.returns.map((r) => (
                  <li key={r.id}>
                    <Link href={`/admin/returns/${r.id}`} className="underline">
                      {fa.returns.types[r.type]} — {fa.returns.status[r.status]}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className={box}>
            <NoteForm number={o.number} initial={o.internalNote ?? ""} />
          </section>
        </aside>
      </div>
    </div>
  );
}
