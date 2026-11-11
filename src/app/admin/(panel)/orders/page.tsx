import type { Metadata } from "next";
import Link from "next/link";
import { StatusChip } from "@/components/admin/StatusChip";
import { fa } from "@/content/fa";
import { formatNumber, formatOrderNumber } from "@/lib/format";
import { formatMobile } from "@/modules/account";
import { requireStaff } from "@/modules/admin/server";
import { SHIPPING_METHODS } from "@/modules/checkout";
import { listOrdersAdmin, parseOrderFilters } from "@/modules/checkout/server";

export const metadata: Metadata = { title: fa.admin.orders.title };

const STATUSES = [
  "PAID",
  "PROCESSING",
  "READY_FOR_PICKUP",
  "SHIPPED",
  "DELIVERED",
  "PENDING_PAYMENT",
  "CANCELLED",
  "RETURNED",
] as const;

const date = (d: Date) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium", timeStyle: "short" }).format(
    d,
  );

/** فهرست سفارش‌ها با جستجو و فیلتر (FR-ADM-04) */
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireStaff("orders.view");
  const f = parseOrderFilters(await searchParams);
  const { rows, total, pages, counts } = await listOrdersAdmin(f);
  const t = fa.admin.orders;
  const qs = (patch: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = {
      q: f.q,
      status: f.status,
      method: f.method,
      pay: f.pay,
      days: f.days,
      ...patch,
    };
    for (const [k, v] of Object.entries(merged))
      if (v !== undefined && v !== "") p.set(k, String(v));
    const s = p.toString();
    return s ? `?${s}` : "?";
  };
  const sel = "rounded-ctl border-line bg-surface min-h-10 border-[1.5px] px-2 text-sm";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <span className="text-ink-2 text-sm">{t.count(total)}</span>
      </div>

      <nav aria-label={fa.checkout.order.status} className="flex flex-wrap gap-2 text-sm">
        <Link
          href={qs({ status: undefined, page: undefined })}
          aria-current={!f.status ? "page" : undefined}
          className={`rounded-chip border-line border px-3 py-1 ${!f.status ? "bg-ink text-bg" : ""}`}
        >
          {t.allStatuses}
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={qs({ status: s, page: undefined })}
            aria-current={f.status === s ? "page" : undefined}
            className={`rounded-chip border-line border px-3 py-1 ${f.status === s ? "bg-ink text-bg" : ""}`}
          >
            {fa.checkout.status[s]}{" "}
            <span className={f.status === s ? "" : "text-steel"}>
              {formatNumber(counts[s] ?? 0)}
            </span>
          </Link>
        ))}
      </nav>

      <form className="rounded-card border-line bg-surface grid gap-3 border p-4 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        {f.status && <input type="hidden" name="status" value={f.status} />}
        <label className="sr-only" htmlFor="o-q">
          {t.search}
        </label>
        <input id="o-q" name="q" defaultValue={f.q} placeholder={t.search} className={sel} />
        <select
          name="method"
          defaultValue={f.method ?? ""}
          aria-label={t.allMethods}
          className={sel}
        >
          <option value="">{t.allMethods}</option>
          {SHIPPING_METHODS.map((m) => (
            <option key={m} value={m}>
              {fa.checkout.methods[m]}
            </option>
          ))}
        </select>
        <select name="pay" defaultValue={f.pay ?? ""} aria-label={t.allPayments} className={sel}>
          <option value="">{t.allPayments}</option>
          <option value="ONLINE">{fa.checkout.pay.ONLINE}</option>
          <option value="COD">{fa.checkout.pay.COD}</option>
        </select>
        <select name="days" defaultValue={f.days ?? ""} aria-label={t.anyTime} className={sel}>
          <option value="">{t.anyTime}</option>
          {[1, 7, 30].map((d) => (
            <option key={d} value={d}>
              {t.days[d]}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-ctl bg-ink text-bg min-h-10 px-4 text-sm font-bold"
          >
            {t.apply}
          </button>
          {(f.q || f.method || f.pay || f.days) && (
            <Link
              href={qs({ q: undefined, method: undefined, pay: undefined, days: undefined })}
              className="text-ink-2 self-center text-sm underline"
            >
              {t.clear}
            </Link>
          )}
        </div>
      </form>

      <div className="rounded-card border-line bg-surface overflow-x-auto border">
        {rows.length ? (
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-line text-steel border-b">
                {Object.values(t.col).map((c) => (
                  <th key={c} className="p-3 text-start font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr
                  key={o.number}
                  className="border-line hover:bg-surface-2/50 border-b last:border-0"
                >
                  <td className="p-3">
                    <Link
                      href={`/admin/orders/${o.number}`}
                      className="font-bold underline-offset-4 hover:underline"
                    >
                      #{formatOrderNumber(o.number)}
                    </Link>
                    {o._count.returns > 0 && (
                      <span className="rounded-chip bg-copper/15 text-copper ms-2 px-2 text-xs">
                        {t.returnsBadge}
                      </span>
                    )}
                  </td>
                  <td className="text-ink-2 p-3 whitespace-nowrap">{date(o.createdAt)}</td>
                  <td className="p-3">
                    {o.user.name ?? "—"}
                    <span className="text-ink-2 block">{formatMobile(o.user.mobile)}</span>
                  </td>
                  <td className="p-3">
                    {fa.checkout.methods[o.shippingMethod]}
                    <span className="text-ink-2 block">{fa.checkout.pay[o.paymentMethod]}</span>
                  </td>
                  <td className="p-3 whitespace-nowrap">{formatNumber(o.grandTotal)}</td>
                  <td className="p-3">
                    <StatusChip status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-ink-2 p-6 text-sm">{t.empty}</p>
        )}
      </div>

      {pages > 1 && (
        <nav className="flex items-center justify-between text-sm">
          {f.page > 1 ? (
            <Link href={qs({ page: f.page - 1 })}>{fa.admin.audit.prev}</Link>
          ) : (
            <span />
          )}
          <span className="text-ink-2">
            {f.page.toLocaleString("fa-IR")} / {pages.toLocaleString("fa-IR")}
          </span>
          {f.page < pages ? (
            <Link href={qs({ page: f.page + 1 })}>{fa.admin.audit.next}</Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
