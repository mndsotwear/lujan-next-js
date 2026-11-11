import { fa } from "@/content/fa";
import { formatNumber } from "@/lib/format";

type SummaryOrder = {
  subtotal: number;
  discountTotal: number;
  shippingCost: number;
  grandTotal: number;
  items: { id: string; productName: string; quantity: number; unitPrice: number }[];
};

export function OrderSummary({ o }: { o: SummaryOrder }) {
  const row = (label: string, value: string, tone = "") => (
    <>
      <dt className="text-ink-2">{label}</dt>
      <dd className={`text-end ${tone}`}>{value}</dd>
    </>
  );
  return (
    <div>
      <ul className="divide-line divide-y text-sm">
        {o.items.map((it) => (
          <li key={it.id} className="flex justify-between gap-3 py-2">
            <span>
              {it.productName}{" "}
              {it.quantity > 1 && (
                <small className="text-steel">× {formatNumber(it.quantity)}</small>
              )}
            </span>
            <b className="whitespace-nowrap">{formatNumber(it.unitPrice * it.quantity)}</b>
          </li>
        ))}
      </ul>
      <dl className="border-line mt-3 grid grid-cols-[1fr_auto] gap-2 border-t pt-3 text-sm">
        {row(fa.checkout.order.subtotal, formatNumber(o.subtotal))}
        {o.discountTotal > 0 &&
          row(fa.checkout.order.discount, `− ${formatNumber(o.discountTotal)}`, "text-ok")}
        {row(
          fa.checkout.shippingLine,
          o.shippingCost ? formatNumber(o.shippingCost) : fa.checkout.free,
        )}
      </dl>
      <div className="border-line mt-3 flex items-baseline justify-between border-t pt-3">
        <span>{fa.checkout.order.grand}</span>
        <strong className="text-lg font-black">
          {formatNumber(o.grandTotal)}{" "}
          <small className="text-sm font-normal">{fa.units.toman}</small>
        </strong>
      </div>
    </div>
  );
}
