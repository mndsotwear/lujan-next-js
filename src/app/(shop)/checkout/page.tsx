import type { Metadata } from "next";
import { LoginForm } from "@/components/account/LoginForm";
import { CheckoutView } from "@/components/checkout/CheckoutView";
import { fa } from "@/content/fa";
import { db } from "@/lib/db";
import { getCurrentUser, listAddresses } from "@/modules/account/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: fa.checkout.title, robots: { index: false } };

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-24 lg:pb-8">
      <h1 className="my-6 text-2xl font-bold">{fa.checkout.title}</h1>
      {!user ? (
        <section className="rounded-card border-line bg-surface border p-6">
          <h2 className="mb-4 font-bold">۱. {fa.checkout.steps.contact}</h2>
          <LoginForm next="/checkout" devMode={(process.env.SMS_PROVIDER ?? "dev") === "dev"} />
        </section>
      ) : (
        <CheckoutView
          mobile={user.mobile}
          addresses={await listAddresses(user.id)}
          hasInvoiceInfo={await db.user
            .findUnique({ where: { id: user.id }, select: { invoiceInfo: true } })
            .then((u) => {
              const i = (u?.invoiceInfo ?? {}) as { companyName?: string; nationalId?: string };
              return !!(i.companyName && i.nationalId);
            })}
        />
      )}
    </main>
  );
}
