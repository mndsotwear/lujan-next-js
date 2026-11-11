/**
 * فاکتور قابل چاپ (FR-CHK-09، D-027) — مشترک بین حساب مشتری و پنل مدیریت.
 */
import { PrintButton } from "@/components/checkout/PrintButton";
import { fa } from "@/content/fa";
import { formatNumber, formatOrderNumber, tomanToRial } from "@/lib/format";
import { formatMobile } from "@/modules/account";

export type InvoiceOrder = {
  number: number;
  createdAt: Date;
  officialInvoice: boolean;
  invoiceInfo: unknown;
  shippingAddress: unknown;
  discountTotal: number;
  shippingCost: number;
  grandTotal: number;
  user: { name: string | null; mobile: string };
  items: { id: string; productName: string; sku: string; quantity: number; unitPrice: number }[];
};

export function InvoiceView({ o }: { o: InvoiceOrder }) {
  const inv = (o.invoiceInfo ?? {}) as {
    companyName?: string;
    nationalId?: string;
    economicCode?: string;
  };
  const addr = o.shippingAddress as {
    province: string;
    city: string;
    line: string;
    postalCode: string;
  } | null;
  const t = fa.checkout.invoice;
  const cell = "border border-line px-3 py-2";
  return (
    <article className="invoice rounded-card border-line bg-surface border p-6 text-sm print:border-0 print:p-0">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{o.officialInvoice ? t.official : t.title}</h2>
          <p className="text-steel">
            #{formatOrderNumber(o.number)} —{" "}
            {new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "long" }).format(
              o.createdAt,
            )}
          </p>
        </div>
        <PrintButton />
      </header>
      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <section className="rounded-ctl border-line border p-3">
          <h3 className="mb-1 font-bold">{t.seller}</h3>
          <p>{t.sellerName}</p>
        </section>
        <section className="rounded-ctl border-line border p-3">
          <h3 className="mb-1 font-bold">{t.buyer}</h3>
          {o.officialInvoice && inv.companyName ? (
            <p>
              {inv.companyName} — {fa.account.fields.nationalId}: {inv.nationalId}
              {inv.economicCode ? ` — ${fa.account.fields.economicCode}: ${inv.economicCode}` : ""}
            </p>
          ) : (
            <p>
              {o.user.name ?? "—"} — {formatMobile(o.user.mobile)}
            </p>
          )}
          {addr && (
            <p className="text-steel">
              {addr.province}، {addr.city}، {addr.line} — {fa.account.fields.postalCode}:{" "}
              {addr.postalCode}
            </p>
          )}
        </section>
      </div>
      <table className="w-full border-collapse">
        <thead className="bg-surface-2">
          <tr>
            <th className={cell}>{t.row}</th>
            <th className={`${cell} text-start`}>{t.product}</th>
            <th className={cell}>{t.qty}</th>
            <th className={cell}>{t.unit}</th>
            <th className={cell}>{t.total}</th>
          </tr>
        </thead>
        <tbody>
          {o.items.map((it, i) => (
            <tr key={it.id}>
              <td className={`${cell} text-center`}>{formatNumber(i + 1)}</td>
              <td className={cell}>
                {it.productName}
                {it.sku && (
                  <small className="text-steel block" dir="ltr">
                    {it.sku}
                  </small>
                )}
              </td>
              <td className={`${cell} text-center`}>{formatNumber(it.quantity)}</td>
              <td className={`${cell} text-center`}>{formatNumber(it.unitPrice)}</td>
              <td className={`${cell} text-center`}>{formatNumber(it.unitPrice * it.quantity)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {o.discountTotal > 0 && (
            <tr>
              <td colSpan={4} className={`${cell} text-end`}>
                {fa.checkout.order.discount}
              </td>
              <td className={`${cell} text-center`}>− {formatNumber(o.discountTotal)}</td>
            </tr>
          )}
          <tr>
            <td colSpan={4} className={`${cell} text-end`}>
              {fa.checkout.shippingLine}
            </td>
            <td className={`${cell} text-center`}>{formatNumber(o.shippingCost)}</td>
          </tr>
          <tr className="font-bold">
            <td colSpan={4} className={`${cell} text-end`}>
              {fa.checkout.order.grand}
            </td>
            <td className={`${cell} text-center`}>{formatNumber(o.grandTotal)}</td>
          </tr>
          {o.officialInvoice && (
            <tr>
              <td colSpan={4} className={`${cell} text-end`}>
                {t.rial}
              </td>
              <td className={`${cell} text-center`}>
                {formatNumber(tomanToRial(o.grandTotal))} ریال
              </td>
            </tr>
          )}
        </tfoot>
      </table>
      <p className="text-steel mt-4 text-xs">{t.vatNote}</p>
    </article>
  );
}
