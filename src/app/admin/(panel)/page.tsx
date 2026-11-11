import type { Metadata } from "next";
import { SalesChart } from "@/components/admin/SalesChart";
import { fa } from "@/content/fa";
import { formatNumber } from "@/lib/format";
import { can } from "@/modules/admin";
import { getDashboard, requireStaff } from "@/modules/admin/server";

export const metadata: Metadata = { title: fa.admin.nav.dashboard };

/** داشبورد (FR-ADM-11) */
export default async function DashboardPage() {
  const me = await requireStaff("dashboard.view");
  const d = await getDashboard();
  const t = fa.admin.dashboard;
  const box = "rounded-card border-line bg-surface border p-5";
  const stat = (label: string, s: { revenue: number; orders: number; aov: number }) => (
    <section className={box}>
      <h2 className="text-ink-2 mb-3 text-sm">{label}</h2>
      <dl className="grid grid-cols-3 gap-3">
        <div>
          <dt className="text-steel text-xs">{t.revenue}</dt>
          <dd className="text-lg font-bold">{formatNumber(s.revenue)}</dd>
        </div>
        <div>
          <dt className="text-steel text-xs">{t.orders}</dt>
          <dd className="text-lg font-bold">{formatNumber(s.orders)}</dd>
        </div>
        <div>
          <dt className="text-steel text-xs">{t.aov}</dt>
          <dd className="text-lg font-bold">{formatNumber(s.aov)}</dd>
        </div>
      </dl>
    </section>
  );
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{fa.admin.nav.dashboard}</h1>
      <section className={`${box} grid gap-3 sm:grid-cols-2 lg:grid-cols-4`} aria-label={t.todo}>
        {[
          ...(can(me.role, "orders.cancel") ? [[t.toCancel, d.todo.toCancel]] : []),
          [t.toProcess, d.todo.toProcess],
          [t.toReview, d.todo.toReview],
          [t.lowStock, d.todo.lowStock],
        ].map(([label, n]) => (
          <div key={label as string} className="flex items-baseline gap-2">
            <b className={`text-2xl ${(n as number) > 0 ? "text-copper" : ""}`}>
              {formatNumber(n as number)}
            </b>
            <span className="text-ink-2 text-sm">{label}</span>
          </div>
        ))}
      </section>
      <div className="grid gap-5 md:grid-cols-2">
        {stat(t.today, d.today)}
        {stat(t.month, d.month)}
      </div>
      <section className={box}>
        <h2 className="mb-3 font-bold">{t.last30}</h2>
        <SalesChart series={d.series} />
      </section>
      <div className="grid gap-5 md:grid-cols-3">
        <section className={`${box} md:col-span-2`}>
          <h2 className="mb-3 font-bold">{t.best}</h2>
          {d.best.length ? (
            <ol className="space-y-2 text-sm">
              {d.best.map((b) => (
                <li key={b.name} className="flex justify-between gap-3">
                  <span className="min-w-0">{b.name}</span>
                  <span className="text-ink-2 whitespace-nowrap">
                    {t.sold(b.qty)} — {formatNumber(b.revenue)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-ink-2 text-sm">{t.noSales}</p>
          )}
        </section>
        <div className="space-y-5">
          <section className={box}>
            <h2 className="text-ink-2 text-sm">{t.conversion}</h2>
            <p className="mt-1 text-2xl font-bold">{d.conversion.toLocaleString("fa-IR")}٪</p>
            <small className="text-steel text-xs">{t.conversionHint}</small>
          </section>
          <section className={box}>
            <h2 className="text-ink-2 text-sm">{t.abandoned}</h2>
            <p className="mt-1 text-2xl font-bold">{formatNumber(d.abandoned.count)}</p>
            <small className="text-steel text-xs">
              {t.abandonedHint(formatNumber(d.abandoned.value))}
            </small>
          </section>
        </div>
      </div>
    </div>
  );
}
