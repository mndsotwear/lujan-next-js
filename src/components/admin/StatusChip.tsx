import { fa } from "@/content/fa";

/** برچسب وضعیت سفارش با رنگ کار منتظر */
export function StatusChip({ status }: { status: keyof typeof fa.checkout.status }) {
  const tone =
    status === "PAID" || status === "PROCESSING"
      ? "bg-copper text-copper-ink"
      : status === "CANCELLED"
        ? "bg-surface-2 text-bad"
        : status === "DELIVERED"
          ? "bg-ok/15 text-ok"
          : "bg-surface-2";
  return (
    <span className={`rounded-chip px-2 py-0.5 text-xs whitespace-nowrap ${tone}`}>
      {fa.checkout.status[status]}
    </span>
  );
}
