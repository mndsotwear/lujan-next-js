import type { Metadata } from "next";
import { Pager } from "@/components/admin/Pager";
import { pageOf, paginate } from "@/lib/paginate";
import Link from "next/link";
import { fa } from "@/content/fa";
import { formatNumber, formatOrderNumber } from "@/lib/format";
import { formatMobile } from "@/modules/account";
import { requireStaff } from "@/modules/admin/server";
import { listReturnsAdmin } from "@/modules/returns/server";

export const metadata: Metadata = { title: fa.admin.returns.title };

const date = (d: Date) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium" }).format(d);

/** فهرست مرجوعی‌ها (FR-RET-02) */
export default async function AdminReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  await requireStaff("returns.manage");
  const { tab: raw, page: rawPage } = await searchParams;
  const tab = raw === "closed" || raw === "all" ? raw : "open";
  const rows = await listReturnsAdmin(tab);
  const pg = paginate(rows, pageOf(rawPage));
  const t = fa.admin.returns;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <nav className="flex gap-2 text-sm">
        {(["open", "closed", "all"] as const).map((k) => (
          <Link
            key={k}
            href={`?tab=${k}`}
            aria-current={tab === k ? "page" : undefined}
            className={`rounded-chip border-line border px-3 py-1 ${tab === k ? "bg-ink text-bg" : ""}`}
          >
            {t.tabs[k]}
          </Link>
        ))}
      </nav>
      <Pager page={pg.page} pages={pg.pages} total={pg.total} params={{ tab }} />
      <div className="rounded-card border-line bg-surface overflow-x-auto border">
        {rows.length ? (
          <table className="w-full min-w-[760px] text-sm">
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
              {pg.items.map((r) => (
                <tr key={r.id} className="border-line hover:bg-surface-2/50 border-b last:border-0">
                  <td className="p-3">
                    <Link
                      href={`/admin/returns/${r.id}`}
                      className="font-bold underline-offset-4 hover:underline"
                    >
                      #{formatOrderNumber(r.order.number)}
                    </Link>
                  </td>
                  <td className="p-3">
                    {r.order.user.name ?? "—"}
                    <span className="text-ink-2 block">{formatMobile(r.order.user.mobile)}</span>
                  </td>
                  <td className="p-3">
                    {fa.returns.types[r.type]}
                    <span className="text-ink-2 block">{fa.returns.reasons[r.reasonCode]}</span>
                  </td>
                  <td className="p-3">
                    {formatNumber(r.items.reduce((s, i) => s + i.quantity, 0))}
                  </td>
                  <td className="text-ink-2 p-3">{date(r.createdAt)}</td>
                  <td className="p-3">
                    <span className={r.status === "REQUESTED" ? "text-copper font-bold" : ""}>
                      {fa.returns.status[r.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-ink-2 p-6 text-sm">{t.empty}</p>
        )}
      </div>
    </div>
  );
}
