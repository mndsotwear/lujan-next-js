import { fa } from "@/content/fa";
import type { StockState } from "@/modules/catalog";

const tone: Record<StockState, string> = { in_stock: "text-ok", low: "text-warn", out: "text-bad" };

/** برچسب موجودی (FR-CAT-04) — رنگ همراه متن است، نه به‌تنهایی (WCAG). */
export function StockBadge({ stock, available }: { stock: StockState; available: number }) {
  const label =
    stock === "low" ? fa.stock.low(available) : stock === "out" ? fa.stock.out : fa.stock.in_stock;
  return (
    <span
      className={`rounded-chip inline-flex items-center gap-1.5 self-start border border-current px-2 text-xs font-medium ${tone[stock]}`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
