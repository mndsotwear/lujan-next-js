import { formatNumber } from "@/lib/format";
import { Icon } from "./Icon";

/** امتیاز با یک رقم اعشار (۴٫۷) — formatNumber برای قیمت است و اعشار را گرد می‌کند. */
export function Rating({
  avg,
  count,
  showCount = true,
}: {
  avg: number;
  count: number;
  showCount?: boolean;
}) {
  if (!count) return null;
  const score = avg.toLocaleString("fa-IR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return (
    <span className="text-ink-2 inline-flex items-center gap-1 text-xs">
      <Icon name="star" className="text-warn size-3" />
      <b className="text-ink">{score}</b>
      {showCount && `(${formatNumber(count)})`}
    </span>
  );
}
