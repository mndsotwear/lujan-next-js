import type { Metadata } from "next";
import Link from "next/link";
import { fa } from "@/content/fa";
import { formatMobile } from "@/modules/account";
import { listAudit, requireStaff } from "@/modules/admin/server";

export const metadata: Metadata = { title: fa.admin.audit.title };

const date = (d: Date) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(d);

const FILTERS = ["auth.", "staff.", "order.", "return.", "product.", "stock."];

/** تاریخچه‌ی فعالیت (FR-ADM-10، NFR-SEC-07) */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; a?: string }>;
}) {
  await requireStaff("audit.view");
  const sp = await searchParams;
  const page = /^\d{1,5}$/.test(sp.page ?? "") ? Math.max(1, Number(sp.page)) : 1;
  const filter = FILTERS.includes(sp.a ?? "") ? sp.a : undefined;
  const { rows, pages } = await listAudit(page, filter);
  const t = fa.admin.audit;
  const qs = (p: number) =>
    `?${new URLSearchParams({ ...(filter ? { a: filter } : {}), page: String(p) })}`;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <p className="text-ink-2 text-sm">{t.intro}</p>
      <nav aria-label={t.filter} className="flex flex-wrap gap-2 text-sm">
        {[undefined, ...FILTERS].map((f) => (
          <Link
            key={f ?? "all"}
            href={f ? `?a=${f}` : "?"}
            aria-current={f === filter ? "page" : undefined}
            className={`rounded-chip border-line border px-3 py-1 ${f === filter ? "bg-ink text-bg" : ""}`}
          >
            {f ? t.filters[f as keyof typeof t.filters] : t.all}
          </Link>
        ))}
      </nav>
      <div className="rounded-card border-line bg-surface overflow-x-auto border">
        {rows.length ? (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-line text-steel border-b">
                <th className="p-3 text-start font-medium">{t.when}</th>
                <th className="p-3 text-start font-medium">{t.who}</th>
                <th className="p-3 text-start font-medium">{t.action}</th>
                <th className="p-3 text-start font-medium">{t.details}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-line border-b align-top last:border-0">
                  <td className="text-ink-2 p-3 whitespace-nowrap">{date(r.createdAt)}</td>
                  <td className="p-3">
                    {r.actor ? (r.actor.name ?? formatMobile(r.actor.mobile)) : "—"}
                  </td>
                  <td className="p-3">{t.actions[r.action] ?? r.action}</td>
                  <td className="text-ink-2 p-3">
                    {r.diff ? (
                      <code dir="ltr" className="block max-w-[360px] text-xs break-all">
                        {JSON.stringify(r.diff)}
                      </code>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-ink-2 p-5 text-sm">{t.empty}</p>
        )}
      </div>
      {pages > 1 && (
        <nav className="flex justify-between text-sm">
          {page > 1 ? <Link href={qs(page - 1)}>{t.prev}</Link> : <span />}
          <span className="text-ink-2">
            {page.toLocaleString("fa-IR")} / {pages.toLocaleString("fa-IR")}
          </span>
          {page < pages ? <Link href={qs(page + 1)}>{t.next}</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
