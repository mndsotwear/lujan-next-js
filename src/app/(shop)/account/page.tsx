import type { Metadata } from "next";
import Link from "next/link";
import { ProfileForm } from "@/components/account/ProfileForm";
import { fa } from "@/content/fa";
import { getProfile, listAddresses, listOrders, requireUser } from "@/modules/account/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: fa.nav.account, robots: { index: false } };

export default async function AccountPage() {
  const u = await requireUser("/account");
  const [profile, addresses, orders] = await Promise.all([
    getProfile(u.id),
    listAddresses(u.id),
    listOrders(u.id),
  ]);
  const card = "rounded-card border border-line bg-surface p-5";
  return (
    <div className="space-y-6">
      {!u.name && (
        <section className={card}>
          <p className="text-ink-2 mb-4 text-sm">{fa.account.completeProfile}</p>
          <ProfileForm profile={profile} compact />
        </section>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/account/orders" className={`${card} hover:border-ink`}>
          <b>{fa.account.nav.orders}</b>
          <p className="text-steel mt-1 text-sm">
            {orders.length ? fa.category.count(orders.length) : fa.account.noOrders}
          </p>
        </Link>
        <Link href="/account/addresses" className={`${card} hover:border-ink`}>
          <b>{fa.account.nav.addresses}</b>
          <p className="text-steel mt-1 text-sm">
            {addresses.length
              ? `${addresses.length.toLocaleString("fa-IR")} ${fa.account.nav.addresses}`
              : fa.account.noAddresses}
          </p>
        </Link>
      </div>
    </div>
  );
}
