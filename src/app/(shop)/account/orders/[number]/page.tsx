import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { ReorderButton } from "@/components/checkout/ReorderButton";
import { RetryPayment } from "@/components/checkout/RetryPayment";
import { ReturnSection } from "@/components/returns/ReturnSection";
import { TrackTimeline } from "@/components/track/TrackTimeline";
import { fa } from "@/content/fa";
import { formatNumber, formatOrderNumber } from "@/lib/format";
import { formatMobile } from "@/modules/account";
import { getProfile, requireUser } from "@/modules/account/server";
import { getOrderForUser } from "@/modules/checkout/server";
import { getReturnsForOrder } from "@/modules/returns/server";

export const dynamic = "force-dynamic";

const savedIbanFor = async (userId: string) => (await getProfile(userId)).refundIban;
export const metadata: Metadata = { title: fa.account.nav.orders, robots: { index: false } };

const date = (d: Date) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "long", timeStyle: "short" }).format(
    d,
  );

/** جزئیات سفارش (FR-ACC-03، FR-SHP-05، FR-RET-01، FR-RET-02) */
export default async function OrderDetailPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const user = await requireUser(`/account/orders/${number}`);
  const o = Number.isSafeInteger(Number(number))
    ? await getOrderForUser(user.id, Number(number))
    : null;
  if (!o) notFound();
  const addr = o.shippingAddress as {
    province: string;
    city: string;
    line: string;
    postalCode: string;
    recipient: string;
    phone: string;
  } | null;
  const pay = o.payments[0];
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">
          {fa.checkout.order.title(formatOrderNumber(o.number))}
        </h2>
        <span className="rounded-chip bg-ink text-bg px-2 py-0.5 text-sm">
          {fa.checkout.status[o.status]}
        </span>
      </div>
      {o.status !== "PENDING_PAYMENT" && (
        <div className="rounded-card border-line bg-surface border p-5">
          <TrackTimeline status={o.status} method={o.shippingMethod} shipments={o.shipments} />
        </div>
      )}
      <dl className="rounded-card border-line bg-surface grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border p-5 text-sm">
        <dt className="text-steel">{fa.checkout.order.date}</dt>
        <dd>{date(o.createdAt)}</dd>
        <dt className="text-steel">{fa.checkout.steps.shipping}</dt>
        <dd>
          {fa.checkout.methods[o.shippingMethod]}
          {o.pickupCode ? ` — ${fa.checkout.result.pickupCode}: ${o.pickupCode}` : ""}
        </dd>
        {addr && (
          <>
            <dt className="text-steel">{fa.checkout.order.address}</dt>
            <dd>
              {addr.province}، {addr.city}، {addr.line} — {addr.recipient} (
              {formatMobile(addr.phone)})
            </dd>
          </>
        )}
        <dt className="text-steel">{fa.checkout.order.payment}</dt>
        <dd>
          {fa.checkout.pay[o.paymentMethod]}
          {pay?.refId ? ` — ${fa.checkout.result.refId}: ${pay.refId}` : ""}
        </dd>
      </dl>
      {o.status === "PENDING_PAYMENT" && <RetryPayment number={o.number} />}
      <div className="rounded-card border-line bg-surface border p-5">
        <h3 className="mb-2 font-bold">{fa.checkout.order.items}</h3>
        <OrderSummary o={o} />
      </div>
      {o.refunds.length > 0 && (
        <section className="rounded-card border-line bg-surface border p-5">
          <h3 className="mb-2 font-bold">{fa.checkout.order.refunds}</h3>
          <ul className="space-y-1 text-sm">
            {o.refunds.map((r) => (
              <li key={r.id} className="flex flex-wrap gap-x-3">
                <span className="text-ok font-medium">
                  {fa.checkout.order.refundLine(
                    formatNumber(r.amount),
                    new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "long" }).format(
                      r.createdAt,
                    ),
                  )}
                </span>
                <span className="text-ink-2">
                  {fa.checkout.order.refundRef}: <span dir="ltr">{r.reference}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-steel mt-2 text-xs">{fa.checkout.order.refundHint}</p>
        </section>
      )}
      {o.status !== "PENDING_PAYMENT" && o.status !== "CANCELLED" && (
        <ReturnSection
          order={o}
          returns={await getReturnsForOrder(o.id)}
          savedIban={await savedIbanFor(user.id)}
        />
      )}
      <div className="flex flex-wrap gap-3">
        {o.status !== "PENDING_PAYMENT" && o.status !== "CANCELLED" && (
          <Link
            href={`/account/orders/${o.number}/invoice`}
            className="rounded-ctl border-ink grid min-h-11 place-items-center border-[1.5px] px-4 text-sm font-bold"
          >
            {fa.checkout.order.printInvoice}
          </Link>
        )}
        <ReorderButton number={o.number} />
      </div>
    </section>
  );
}
