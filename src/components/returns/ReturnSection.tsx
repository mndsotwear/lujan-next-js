/** مرجوعی در صفحه‌ی سفارش: درخواست‌های قبلی + فرم جدید (FR-RET-01، FR-RET-02 نمای مشتری) */
import { fa } from "@/content/fa";
import { formatNumber } from "@/lib/format";
import { maskIban } from "@/modules/account";
import { openIban } from "@/modules/account/server";
import { returnableQuantities, returnEligibility } from "@/modules/returns";
import type { ReturnRow } from "@/modules/returns/server";
import { ReturnForm } from "./ReturnForm";

const date = (d: Date) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "long" }).format(d);

export function ReturnSection({
  order,
  returns,
  savedIban,
}: {
  order: {
    number: number;
    status: string;
    deliveredAt: Date | null;
    items: { id: string; productName: string; quantity: number }[];
  };
  returns: ReturnRow[];
  savedIban: string;
}) {
  const t = fa.returns;
  const elig = returnEligibility(order);
  const left = returnableQuantities(order.items, returns);
  const items = order.items
    .map((i) => ({ id: i.id, name: i.productName, max: left[i.id] ?? 0 }))
    .filter((i) => i.max > 0);

  return (
    <section className="rounded-card border-line bg-surface space-y-4 border p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-bold">{t.sectionTitle}</h3>
        {elig.ok && <span className="text-ink-2 text-sm">{t.deadline(date(elig.deadline))}</span>}
      </div>

      {returns.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-ink-2 text-sm">{t.yourRequests}</h4>
          {returns.map((r) => (
            <article key={r.id} className="rounded-ctl border-line border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {t.types[r.type]} — {t.reasons[r.reasonCode]}
                </span>
                <span
                  className={`rounded-chip px-2 py-0.5 text-xs ${r.status === "REJECTED" ? "bg-bad/10 text-bad" : "bg-surface-2"}`}
                >
                  {t.status[r.status]}
                </span>
              </div>
              <ul className="text-ink-2 mt-2 space-y-0.5">
                {r.items.map((i) => (
                  <li key={i.orderItemId}>
                    {i.orderItem.productName} × {formatNumber(i.quantity)}
                  </li>
                ))}
              </ul>
              <p className="mt-2">{r.reason}</p>
              {r.refundIban && (
                <p className="text-ink-2 mt-1" dir="rtl">
                  {t.refundTo(maskIban(openIban(r.refundIban) ?? ""))}
                </p>
              )}
              {r.imageUrls.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {r.imageUrls.map((n) => (
                    <a key={n} href={`/api/returns/image/${n}`} target="_blank" rel="noopener">
                      {/* eslint-disable-next-line @next/next/no-img-element -- تصویر خصوصی با کنترل دسترسی */}
                      <img
                        src={`/api/returns/image/${n}`}
                        alt=""
                        className="rounded-ctl border-line size-16 border object-cover"
                      />
                    </a>
                  ))}
                </div>
              )}
              {r.resolutionNote && (
                <p className="bg-surface-2 rounded-ctl mt-2 p-2">
                  <b>{t.operatorNote}:</b> {r.resolutionNote}
                </p>
              )}
              <small className="text-steel mt-2 block">
                {t.requestedAt}: {date(r.createdAt)}
              </small>
            </article>
          ))}
        </div>
      )}

      {order.status === "RETURNED" ? (
        <p className="text-ink-2 text-sm">{t.orderReturned}</p>
      ) : !elig.ok ? (
        <p className="text-ink-2 text-sm">
          {elig.reason === "window_closed" ? t.windowClosed : t.notDelivered}
        </p>
      ) : items.length ? (
        <ReturnForm orderNumber={order.number} items={items} savedIban={savedIban} />
      ) : (
        <p className="text-ink-2 text-sm">{t.nothingLeft}</p>
      )}
    </section>
  );
}
