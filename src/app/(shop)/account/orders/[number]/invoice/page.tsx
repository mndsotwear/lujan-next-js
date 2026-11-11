import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvoiceView } from "@/components/checkout/InvoiceView";
import { fa } from "@/content/fa";
import { requireUser } from "@/modules/account/server";
import { getOrderForUser } from "@/modules/checkout/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: fa.checkout.invoice.title, robots: { index: false } };

/** فاکتور قابل چاپ مشتری (FR-CHK-09) */
export default async function InvoicePage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const user = await requireUser(`/account/orders/${number}/invoice`);
  const o = Number.isSafeInteger(Number(number))
    ? await getOrderForUser(user.id, Number(number))
    : null;
  if (!o || o.status === "PENDING_PAYMENT" || o.status === "CANCELLED") notFound();
  return <InvoiceView o={o} />;
}
