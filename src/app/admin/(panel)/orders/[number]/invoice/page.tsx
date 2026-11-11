import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvoiceView } from "@/components/checkout/InvoiceView";
import { fa } from "@/content/fa";
import { requireStaff } from "@/modules/admin/server";
import { getOrderAdmin } from "@/modules/checkout/server";

export const metadata: Metadata = { title: fa.checkout.invoice.title };

/** چاپ فاکتور از پنل (FR-ADM-04) — همان فاکتور مشتری */
export default async function AdminInvoicePage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  await requireStaff("orders.view");
  const { number } = await params;
  const o = /^\d{1,9}$/.test(number) ? await getOrderAdmin(Number(number)) : null;
  if (!o || o.status === "PENDING_PAYMENT" || o.status === "CANCELLED") notFound();
  return <InvoiceView o={o} />;
}
