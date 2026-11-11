import type { Metadata } from "next";
import { Pager } from "@/components/admin/Pager";
import { pageOf, paginate } from "@/lib/paginate";
import Link from "next/link";
import { fa } from "@/content/fa";
import { formatNumber } from "@/lib/format";
import { formatMobile } from "@/modules/account";
import { listCustomers } from "@/modules/account/server";
import { requireStaff } from "@/modules/admin/server";

export const metadata: Metadata = { title: fa.admin.customers.title };

const date = (d: Date) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium" }).format(d);

/** فهرست مشتریان (FR-ADM-05) */
export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; page?: string }>;
}) {
  await requireStaff("customers.manage");
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 60) || undefined;
  const type = sp.type === "B2B" || sp.type === "B2C" ? sp.type : undefined;
  const rows = await listCustomers(q, type);
  const pg = paginate(rows, pageOf(sp.page));
  const t = fa.admin.customers;
  const chip = (k: string | undefined, label: string) => (
    <Link
      href={`?${new URLSearchParams({ ...(q ? { q } : {}), ...(k ? { type: k } : {}) })}`}
      aria-current={type === k ? "page" : undefined}
      className={`rounded-chip border-line border px-3 py-1 ${type === k ? "bg-ink text-bg" : ""}`}
    >
      {label}
    </Link>
  );
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <div className="flex flex-wrap items-center gap-3">
        <nav className="flex gap-2 text-sm">
          {chip(undefined, t.all)}
          {chip("B2C", t.retail)}
          {chip("B2B", t.wholesale)}
        </nav>
        <form className="ms-auto flex gap-2">
          {type && <input type="hidden" name="type" value={type} />}
          <input
            name="q"
            defaultValue={q}
            placeholder={t.search}
            aria-label={t.search}
            className="rounded-ctl border-line bg-surface min-h-10 border-[1.5px] px-3 text-sm"
          />
          <button
            type="submit"
            className="rounded-ctl bg-ink text-bg min-h-10 px-4 text-sm font-bold"
          >
            {fa.admin.orders.searchBtn}
          </button>
        </form>
      </div>
      <Pager page={pg.page} pages={pg.pages} total={pg.total} params={{ q: sp.q, type: sp.type }} />
      <p className="text-ink-2 text-sm">{t.count(rows.length)}</p>
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
              {pg.items.map((u) => (
                <tr key={u.id} className="border-line hover:bg-surface-2/50 border-b last:border-0">
                  <td className="p-3">
                    <Link
                      href={`/admin/customers/${u.id}`}
                      className="font-bold underline-offset-4 hover:underline"
                    >
                      {u.name ?? "—"}
                    </Link>
                    <span className="text-ink-2 block">{formatMobile(u.mobile)}</span>
                    {u.deletedAt && <span className="text-bad text-xs">{t.deleted}</span>}
                  </td>
                  <td className="p-3">
                    {u.customerType === "B2B" ? (
                      <span className="text-copper font-medium">
                        {t.wholesale}
                        {u.organization ? ` — ${u.organization.name}` : ""}
                      </span>
                    ) : (
                      t.retail
                    )}
                  </td>
                  <td className="p-3">{formatNumber(u.orders)}</td>
                  <td className="p-3 whitespace-nowrap">{formatNumber(u.spent)}</td>
                  <td className="text-ink-2 p-3">{u.lastOrder ? date(u.lastOrder) : "—"}</td>
                  <td className="text-ink-2 p-3">{date(u.createdAt)}</td>
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
