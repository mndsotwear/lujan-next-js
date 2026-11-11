import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusChip } from "@/components/admin/StatusChip";
import { WholesaleForm } from "@/components/admin/WholesaleForm";
import { fa } from "@/content/fa";
import { formatNumber, formatOrderNumber } from "@/lib/format";
import { formatMobile } from "@/modules/account";
import { getCustomerAdmin } from "@/modules/account/server";
import { requireStaff } from "@/modules/admin/server";

export const metadata: Metadata = { title: fa.admin.customers.title };

const date = (d: Date) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium" }).format(d);

/** جزئیات مشتری و حساب عمده (FR-ADM-05، D-046) */
export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("customers.manage");
  const { id } = await params;
  const u = /^[a-z0-9]{20,40}$/.test(id) ? await getCustomerAdmin(id) : null;
  if (!u) notFound();
  const t = fa.admin.customers;
  const box = "rounded-card border-line bg-surface border p-5";
  return (
    <div className="space-y-5">
      <Link href="/admin/customers" className="text-ink-2 text-sm underline">
        {t.back}
      </Link>
      <h1 className="text-2xl font-bold">{u.name ?? formatMobile(u.mobile)}</h1>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className={box}>
            <h2 className="mb-3 font-bold">{t.wholesaleTitle}</h2>
            <WholesaleForm
              userId={u.id}
              initial={{
                wholesale: u.customerType === "B2B",
                orgName: u.organization?.name ?? "",
                nationalId: u.organization?.nationalId ?? "",
                economicCode: u.organization?.economicCode ?? "",
                priceLevel: u.organization?.priceLevel ?? 1,
              }}
            />
          </section>
          <section className={box}>
            <h2 className="mb-1 font-bold">{t.orders}</h2>
            <p className="text-ink-2 mb-3 text-sm">{t.spent(formatNumber(u.spent))}</p>
            {u.orders.length ? (
              <ul className="divide-line divide-y text-sm">
                {u.orders.map((o) => (
                  <li
                    key={o.number}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <Link href={`/admin/orders/${o.number}`} className="font-medium underline">
                      #{formatOrderNumber(o.number)}
                    </Link>
                    <span className="text-ink-2">{date(o.createdAt)}</span>
                    <span>{formatNumber(o.grandTotal)}</span>
                    <StatusChip status={o.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-2 text-sm">{t.noOrders}</p>
            )}
          </section>
        </div>
        <aside className="space-y-5">
          <section className={`${box} text-sm`}>
            <h2 className="mb-2 font-bold">{t.contact}</h2>
            <p>{formatMobile(u.mobile)}</p>
            {u.email && (
              <p dir="ltr" className="text-ink-2 text-end">
                {u.email}
              </p>
            )}
            <p className="text-ink-2 mt-2">{date(u.createdAt)}</p>
          </section>
          <section className={`${box} text-sm`}>
            <h2 className="mb-2 font-bold">{t.addresses}</h2>
            {u.addresses.length ? (
              <ul className="space-y-2">
                {u.addresses.map((a) => (
                  <li key={a.id} className="leading-7">
                    {a.province}، {a.city}، {a.line}
                    <span className="text-ink-2 block">
                      {a.recipient} — {formatMobile(a.phone)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-2">{t.noAddresses}</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
