import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReturnControls } from "@/components/admin/ReturnControls";
import { fa } from "@/content/fa";
import { formatNumber, formatOrderNumber } from "@/lib/format";
import { formatMobile, groupIban } from "@/modules/account";
import { openIban } from "@/modules/account/server";
import { requireStaff } from "@/modules/admin/server";
import { defaultReturnRefund, refundableAmount } from "@/modules/checkout";
import { returnShippingPayer } from "@/modules/returns";
import { getReturnAdmin } from "@/modules/returns/server";

export const metadata: Metadata = { title: fa.admin.returns.title };

const date = (d: Date) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium", timeStyle: "short" }).format(
    d,
  );

/** جزئیات مرجوعی و گردش‌کار (FR-RET-02) */
export default async function AdminReturnPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("returns.manage");
  const { id } = await params;
  const r = /^[a-z0-9]{20,40}$/.test(id) ? await getReturnAdmin(id) : null;
  if (!r) notFound();
  const t = fa.admin.returns;
  const box = "rounded-card border-line bg-surface border p-5";
  const payer = returnShippingPayer(r.reasonCode);
  const suggested = defaultReturnRefund(
    r.items.map((i) => ({ unitPrice: i.orderItem.unitPrice, quantity: i.quantity })),
  );
  return (
    <div className="space-y-5">
      <Link href="/admin/returns" className="text-ink-2 text-sm underline">
        {t.back}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t.request(formatOrderNumber(r.order.number))}</h1>
        <span className="rounded-chip bg-surface-2 px-3 py-1 text-sm">
          {fa.returns.status[r.status]}
        </span>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <section className={box}>
            <h2 className="mb-3 font-bold">{t.steps}</h2>
            <ReturnControls
              id={r.id}
              orderNumber={r.order.number}
              status={r.status}
              type={r.type}
              maxRefund={refundableAmount(r.order.payments, r.order.refunds)}
              suggested={suggested}
            />
          </section>
          <section className={`${box} space-y-3 text-sm`}>
            <p>
              <b>{fa.returns.types[r.type]}</b> — {fa.returns.reasons[r.reasonCode]}
            </p>
            <p className={payer === "STORE" ? "text-copper" : "text-ink-2"}>
              {t.payer}: {fa.returns.payer[payer]}
            </p>
            <ul className="space-y-1">
              {r.items.map((i) => (
                <li key={i.orderItemId}>
                  {i.orderItem.productName} × {formatNumber(i.quantity)} —{" "}
                  {formatNumber(i.orderItem.unitPrice * i.quantity)}
                </li>
              ))}
            </ul>
            <div>
              <h3 className="text-ink-2 mb-1">{t.description}</h3>
              <p className="whitespace-pre-line">{r.reason}</p>
            </div>
            <div>
              <h3 className="text-ink-2 mb-1">{t.photos}</h3>
              {r.imageUrls.length ? (
                <div className="flex flex-wrap gap-2">
                  {r.imageUrls.map((n) => (
                    <a key={n} href={`/api/returns/image/${n}`} target="_blank" rel="noopener">
                      {/* eslint-disable-next-line @next/next/no-img-element -- تصویر خصوصی با کنترل دسترسی */}
                      <img
                        src={`/api/returns/image/${n}`}
                        alt=""
                        className="rounded-ctl border-line size-28 border object-cover"
                      />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-ink-2">{t.noPhotos}</p>
              )}
            </div>
            {r.resolutionNote && (
              <p className="bg-surface-2 rounded-ctl p-2">
                {fa.returns.operatorNote}: {r.resolutionNote}
              </p>
            )}
            {r.refundIban && (
              <p className="bg-surface-2 rounded-ctl p-2">
                {fa.admin.orders.iban}:{" "}
                <b dir="ltr" className="font-mono select-all">
                  {groupIban(openIban(r.refundIban) ?? "")}
                </b>
              </p>
            )}
            {r.restocked !== null && (
              <p className="text-ink-2">{t.restocked[String(r.restocked) as "true" | "false"]}</p>
            )}
            {r.refunds.map((f) => (
              <p key={f.id} className="text-ok">
                {fa.admin.orders.refunds}: {formatNumber(f.amount)} —{" "}
                <span dir="ltr">{f.reference}</span>
              </p>
            ))}
          </section>
        </div>
        <aside className={`${box} h-fit text-sm`}>
          <h2 className="mb-2 font-bold">{fa.admin.orders.customer}</h2>
          <p>{r.order.user.name ?? "—"}</p>
          <p className="text-ink-2">{formatMobile(r.order.user.mobile)}</p>
          <p className="text-ink-2 mt-2">{date(r.createdAt)}</p>
          <Link
            href={`/admin/orders/${r.order.number}`}
            className="text-copper mt-3 inline-block underline"
          >
            #{formatOrderNumber(r.order.number)}
          </Link>
        </aside>
      </div>
    </div>
  );
}
