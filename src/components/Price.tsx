import { fa } from "@/content/fa";
import { formatNumber } from "@/lib/format";

/** قیمت تومانی با قیمت قبل از تخفیف (FR-CAT-03). */
export function Price({
  price,
  oldPrice,
  size = "md",
  badge = true,
}: {
  price: number;
  oldPrice: number | null;
  size?: "md" | "lg";
  badge?: boolean;
}) {
  const off = oldPrice ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <strong className={size === "lg" ? "text-2xl font-black" : "text-lg font-black"}>
        {formatNumber(price)}
      </strong>
      <span className="text-steel text-xs">{fa.units.toman}</span>
      {oldPrice ? (
        <>
          <s className="text-steel text-sm">{formatNumber(oldPrice)}</s>
          {badge && off > 0 && (
            <span className="rounded-chip bg-bad text-bg px-2 text-xs font-bold">
              {fa.product.off(off)}
            </span>
          )}
        </>
      ) : null}
    </div>
  );
}
