import type { Metadata } from "next";
import Link from "next/link";
import { fa } from "@/content/fa";
import { formatToman, formatOrderNumber } from "@/lib/format";
import { listOrders, requireUser } from "@/modules/account/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: fa.account.nav.orders, robots: { index: false } };

/** تاریخچه‌ی سفارش‌ها (FR-ACC-03) — جزئیات، فاکتور و سفارش مجدد در M1.7 */
export default async function OrdersPage() {
  const u = await requireUser("/account/orders");
  const orders = await listOrders(u.id);
  return (
    <section>
      <h2 className="mb-4 text-xl font-bold">{fa.account.nav.orders}</h2>
      {orders.length === 0 ? (
        <div className="rounded-card border-line bg-surface border p-8">
          <p>{fa.account.noOrders}</p>
        </div>
      ) : (
        <ul className="divide-line rounded-card border-line bg-surface divide-y border">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/account/orders/${o.number}`}
                className="hover:bg-surface-2 grid grid-cols-[auto_1fr_auto] items-center gap-3 p-4 text-sm"
              >
                <b>#{formatOrderNumber(o.number)}</b>
                <span className="text-ink-2">
                  {new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium" }).format(
                    o.createdAt,
                  )}{" "}
                  — {fa.checkout.status[o.status]}
                </span>
                <b>{formatToman(o.grandTotal)}</b>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
