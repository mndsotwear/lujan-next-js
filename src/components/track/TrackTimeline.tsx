/** مراحل سفارش (FR-SHP-05) — همان در پیگیری مهمان و جزئیات سفارش */
import { fa } from "@/content/fa";
import { carrierTrackingPage, handoverKind, trackingSteps } from "@/modules/checkout";
import type { OrderStatus, ShippingMethod } from "@/modules/checkout";
import { Icon } from "../Icon";

export function TrackTimeline({
  status,
  method,
  shipments,
}: {
  status: OrderStatus;
  method: ShippingMethod;
  shipments: { carrier: ShippingMethod; trackingCode: string | null }[];
}) {
  const t = fa.track;
  const s = trackingSteps(status);
  const label = (k: (typeof s.steps)[number]["key"]) =>
    k === "handover" ? t.steps.handover[handoverKind(method)] : t.steps[k];
  const coded = shipments.filter((x) => x.trackingCode);
  return (
    <div className="space-y-4">
      {s.cancelled ? (
        <p className="rounded-ctl bg-surface-2 text-bad p-3 text-sm font-medium">{t.cancelled}</p>
      ) : (
        <ol className="grid gap-0 sm:grid-cols-5" aria-label={t.title}>
          {s.steps.map((st, i) => (
            <li
              key={st.key}
              aria-current={st.state === "current" ? "step" : undefined}
              className={`flex items-center gap-3 py-2 sm:flex-col sm:gap-2 sm:border-t-2 sm:pt-3 sm:text-center ${st.state === "done" ? "sm:border-ok" : st.state === "current" ? "sm:border-copper" : "sm:border-line"}`}
            >
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full border-[1.5px] text-xs font-bold ${
                  st.state === "done"
                    ? "border-ok bg-ok text-white"
                    : st.state === "current"
                      ? "border-copper bg-surface text-copper"
                      : "border-line bg-surface text-steel"
                }`}
              >
                {st.state === "done" ? (
                  <Icon name="check" className="size-4" />
                ) : (
                  (i + 1).toLocaleString("fa-IR")
                )}
              </span>
              <span
                className={`text-sm ${st.state === "todo" ? "text-steel" : "font-medium"} ${st.state === "current" ? "text-copper" : ""}`}
              >
                {label(st.key)}
              </span>
            </li>
          ))}
        </ol>
      )}
      {s.returned && <p className="text-ink-2 text-sm">{t.returned}</p>}
      {method !== "PICKUP" && !s.cancelled && (
        <div className="rounded-ctl bg-surface-2/60 p-3 text-sm">
          {coded.length ? (
            coded.map((x) => {
              const page = carrierTrackingPage(x.carrier);
              return (
                <p key={x.trackingCode} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>
                    {t.trackingCode} {fa.checkout.methods[x.carrier]}:{" "}
                    <b dir="ltr" className="select-all">
                      {x.trackingCode}
                    </b>
                  </span>
                  {page && (
                    <a
                      href={page}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-copper underline"
                    >
                      {t.carrierPage}
                    </a>
                  )}
                </p>
              );
            })
          ) : (
            <p className="text-ink-2">{t.noCodeYet}</p>
          )}
        </div>
      )}
    </div>
  );
}
