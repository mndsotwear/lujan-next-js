import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { RetryPayment } from "@/components/checkout/RetryPayment";
import { TrackPurchase } from "@/components/checkout/TrackPurchase";
import { Icon } from "@/components/Icon";
import { STORE } from "@/config/store";
import { fa } from "@/content/fa";
import { formatOrderNumber } from "@/lib/format";
import { requireUser } from "@/modules/account/server";
import { getOrderForUser } from "@/modules/checkout/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: fa.checkout.title, robots: { index: false } };

export default async function ResultPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const n = Number(number);
  const user = await requireUser(`/checkout/result/${number}`);
  const o = Number.isSafeInteger(n) ? await getOrderForUser(user.id, n) : null;
  if (!o) notFound();
  const lastPay = o.payments[0];
  const success = o.status !== "PENDING_PAYMENT" && o.status !== "CANCELLED";
  const failed = o.status === "PENDING_PAYMENT" && lastPay?.status === "FAILED";
  const time = o.reservedUntil
    ? new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(
        o.reservedUntil,
      )
    : "";
  const title =
    o.status === "CANCELLED"
      ? fa.checkout.result.cancelledTitle
      : failed
        ? fa.checkout.result.failedTitle
        : success
          ? o.paymentMethod === "ONLINE"
            ? fa.checkout.result.paidTitle
            : fa.checkout.result.successTitle
          : fa.checkout.result.pendingTitle;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      {success && <TrackPurchase number={o.number} revenue={o.grandTotal} />}
      <div className="rounded-sheet border-line bg-surface border p-6">
        <div className="flex items-center gap-3">
          <span
            className={`grid size-12 place-items-center rounded-full ${success ? "bg-ok text-white" : "bg-surface-2 text-bad"}`}
          >
            <Icon name={success ? "check" : "info"} className="size-6" />
          </span>
          <h1 className="text-xl font-bold">{title}</h1>
        </div>
        <dl className="my-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-steel">{fa.checkout.result.orderNo}</dt>
          <dd className="font-bold">#{formatOrderNumber(o.number)}</dd>
          <dt className="text-steel">{fa.checkout.order.status}</dt>
          <dd>{fa.checkout.status[o.status]}</dd>
          {lastPay?.refId && (
            <>
              <dt className="text-steel">{fa.checkout.result.refId}</dt>
              <dd dir="ltr" className="text-end">
                {lastPay.refId}
              </dd>
            </>
          )}
        </dl>
        {o.pickupCode && success && (
          <div className="rounded-card bg-copper-soft mb-5 p-4">
            <p className="text-sm">{fa.checkout.result.pickupCode}</p>
            <p className="my-1 text-3xl font-black tracking-[0.3em]" dir="ltr">
              {o.pickupCode}
            </p>
            <p className="text-ink-2 text-xs">
              {fa.checkout.result.pickupHint(STORE.storeLocation.city)}
            </p>
          </div>
        )}
        {success && o.paymentMethod === "COD" && (
          <p className="mb-4 text-sm">{fa.checkout.result.codHint}</p>
        )}
        {success && <p className="text-steel mb-4 text-xs">{fa.checkout.result.smsSent}</p>}
        {failed && (
          <div className="mb-5">
            <p className="text-ink-2 mb-3 text-sm">{fa.checkout.result.failedBody(time)}</p>
            <RetryPayment number={o.number} />
          </div>
        )}
        {o.status === "CANCELLED" && (
          <p className="text-ink-2 mb-5 text-sm">{fa.checkout.result.cancelledBody}</p>
        )}
        <OrderSummary o={o} />
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/account/orders/${o.number}`}
            className="rounded-ctl border-ink grid min-h-11 place-items-center border-[1.5px] px-4 text-sm font-bold"
          >
            {fa.checkout.result.viewOrder}
          </Link>
          <Link href="/" className="text-ink-2 grid min-h-11 place-items-center px-4 text-sm">
            {fa.checkout.result.continueShopping}
          </Link>
        </div>
      </div>
    </main>
  );
}
