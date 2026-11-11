import type { Metadata } from "next";
import { AddressBook } from "@/components/account/AddressBook";
import { fa } from "@/content/fa";
import { listAddresses, requireUser } from "@/modules/account/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: fa.account.nav.addresses, robots: { index: false } };

export default async function AddressesPage() {
  const u = await requireUser("/account/addresses");
  const addresses = await listAddresses(u.id);
  return (
    <section>
      <h2 className="mb-4 text-xl font-bold">{fa.account.nav.addresses}</h2>
      <AddressBook addresses={addresses} />
    </section>
  );
}
