import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/checkout/PrintButton";
import { STORE } from "@/config/store";
import { fa } from "@/content/fa";
import { formatNumber, formatOrderNumber } from "@/lib/format";
import { formatMobile } from "@/modules/account";
import { requireStaff } from "@/modules/admin/server";
import { chargeableKg } from "@/modules/checkout";
import { getOrderAdmin } from "@/modules/checkout/server";

export const metadata: Metadata = { title: fa.admin.orders.label };

/** برچسب ارسال قابل چاپ، اندازه‌ی A6 (FR-ADM-04) */
export default async function LabelPage({ params }: { params: Promise<{ number: string }> }) {
  await requireStaff("orders.view");
  const { number } = await params;
  const o = /^\d{1,9}$/.test(number) ? await getOrderAdmin(Number(number)) : null;
  if (!o) notFound();
  const t = fa.admin.orders;
  const a = o.shippingAddress as {
    province: string;
    city: string;
    line: string;
    postalCode: string;
    recipient: string;
    phone: string;
  } | null;
  if (!a) return <p className="text-ink-2">{t.labelPickup}</p>;
  const grams = o.items.reduce((s, i) => s + i.variant.weightGrams * i.quantity, 0) + 300;
  const code = o.shipments.at(-1)?.trackingCode;
  return (
    <div className="space-y-4">
      <div className="no-print">
        <PrintButton />
      </div>
      <article className="label border-ink mx-auto w-[105mm] border-2 bg-white p-4 text-[13px] leading-6 text-black">
        <div className="flex items-start justify-between border-b-2 border-black pb-2">
          <div>
            <b className="text-base">{fa.checkout.methods[o.shippingMethod]}</b>
            <p>{t.weight(chargeableKg({ grams, volumeCm3: 0 }).toLocaleString("fa-IR"))}</p>
          </div>
          <div className="text-end">
            <p className="text-2xl font-black">#{formatOrderNumber(o.number)}</p>
            {code && (
              <p dir="ltr" className="font-mono">
                {code}
              </p>
            )}
          </div>
        </div>
        <section className="border-b border-black py-2">
          <h2 className="text-xs">{t.labelRecipient}</h2>
          <p className="text-lg font-bold">{a.recipient}</p>
          <p>
            {a.province}، {a.city}
          </p>
          <p>{a.line}</p>
          <p>
            {t.labelPostal}: <b dir="ltr">{a.postalCode}</b> — {t.labelPhone}:{" "}
            <b>{formatMobile(a.phone)}</b>
          </p>
        </section>
        <section className="pt-2">
          <h2 className="text-xs">{t.labelSender}</h2>
          <p>
            {fa.site.name} — {STORE.storeLocation.province}، {STORE.storeLocation.city}
          </p>
          <p className="text-[11px]">
            {o.items.map((i) => `${i.productName} × ${formatNumber(i.quantity)}`).join("، ")}
          </p>
        </section>
      </article>
    </div>
  );
}
