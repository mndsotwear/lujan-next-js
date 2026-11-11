import type { Metadata } from "next";
import Link from "next/link";
import { DownloadLink } from "@/components/admin/DownloadLink";
import { SalesChart } from "@/components/admin/SalesChart";
import { fa } from "@/content/fa";
import { formatNumber, toPersianDigits } from "@/lib/format";
import { buildTables, can, type ReportTable, type Table } from "@/modules/admin";
import { getReport, parseRange, requireStaff } from "@/modules/admin/server";
import { zeroResultQueries } from "@/modules/search/server";

export const metadata: Metadata = { title: fa.admin.reports.title };

const BOX = "rounded-card border-line bg-surface border p-5";

function ExportLinks({ type, qs }: { type: ReportTable; qs: URLSearchParams }) {
  const t = fa.admin.reports;
  const href = (format: string) =>
    `/admin/reports/export?${new URLSearchParams({ ...Object.fromEntries(qs), type, format })}`;
  return (
    <span className="flex gap-2">
      <DownloadLink href={href("xlsx")}>{t.export} xlsx</DownloadLink>
      <DownloadLink href={href("csv")}>csv</DownloadLink>
    </span>
  );
}

function TableView({
  type,
  table,
  hint,
  qs,
}: {
  type: ReportTable;
  table: Table;
  hint?: string;
  qs: URLSearchParams;
}) {
  const t = fa.admin.reports;
  return (
    <section className={BOX}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">{table.title}</h2>
        {table.rows.length > 0 && <ExportLinks type={type} qs={qs} />}
      </div>
      {hint && <p className="text-steel mb-3 text-xs">{hint}</p>}
      {table.rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-line text-steel border-b">
                {table.headers.map((h) => (
                  <th key={h} className="p-2 text-start font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, i) => (
                <tr key={i} className="border-line border-b last:border-0">
                  {row.map((c, j) => (
                    <td key={j} className="p-2">
                      {c === null
                        ? t.noCost
                        : typeof c === "number"
                          ? formatNumber(c)
                          : toPersianDigits(c).replace("%", "٪")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-ink-2 text-sm">{t.empty}</p>
      )}
    </section>
  );
}

/** گزارش‌ها با خروجی اکسل/CSV (FR-ADM-12, FR-ADM-13) */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const me = await requireStaff("reports.view");
  const sp = await searchParams;
  const range = parseRange(sp);
  const canCost = can(me.role, "products.price");
  const [r, zero] = await Promise.all([getReport(range), zeroResultQueries(30)]);
  const tables = buildTables({ ...r, zero }, canCost);
  const t = fa.admin.reports;
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
  const box = BOX;
  const exportLinks = (type: ReportTable) => <ExportLinks type={type} qs={qs} />;
  const input = "rounded-ctl border-line bg-surface min-h-10 w-36 border-[1.5px] px-2 text-sm";
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <div className="flex flex-wrap items-end gap-3">
        <nav className="flex gap-2 text-sm">
          {["7", "30", "90"].map((d) => (
            <Link
              key={d}
              href={`?days=${d}`}
              aria-current={!sp.from && range.label === d ? "page" : undefined}
              className={`rounded-chip border-line border px-3 py-1 ${!sp.from && range.label === d ? "bg-ink text-bg" : ""}`}
            >
              {t.days[d]}
            </Link>
          ))}
        </nav>
        <form className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs">
            {t.from}
            <input name="from" defaultValue={sp.from} dir="ltr" className={input} />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            {t.to}
            <input name="to" defaultValue={sp.to} dir="ltr" className={input} />
          </label>
          <button
            type="submit"
            className="rounded-ctl bg-ink text-bg min-h-10 px-4 text-sm font-bold"
          >
            {t.apply}
          </button>
        </form>
      </div>

      <section className={`${box} grid gap-4 sm:grid-cols-2 lg:grid-cols-4`}>
        {[
          [t.revenue, r.summary.revenue],
          [t.orders, r.summary.orders],
          [t.aov, r.summary.aov],
          ...(canCost ? [[t.profit, r.profit]] : []),
        ].map(([label, value]) => (
          <div key={label as string}>
            <p className="text-steel text-xs">{label}</p>
            <p className="text-xl font-bold">{formatNumber(value as number)}</p>
            {label === t.profit && (
              <small className="text-steel text-xs">{t.coverage(r.coverage)}</small>
            )}
          </div>
        ))}
      </section>

      <section className={box}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">{t.daily}</h2>
          {exportLinks("daily")}
        </div>
        <SalesChart series={r.series} />
      </section>
      <div className="grid gap-5 xl:grid-cols-2">
        <TableView type="category" table={tables.category} qs={qs} />
        <TableView type="brand" table={tables.brand} qs={qs} />
      </div>
      <TableView type="product" table={tables.product} qs={qs} />
      <TableView type="rules" table={tables.rules} hint={t.rulesHint} qs={qs} />
      <TableView type="zero" table={tables.zero} qs={qs} />
      <p className="text-steel text-sm">{t.assistant}</p>
    </div>
  );
}
