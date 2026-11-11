/** نمودار ستونی فروش روزانه (SVG بدون کتابخانه) */
import { formatNumber } from "@/lib/format";

export function SalesChart({
  series,
}: {
  series: { day: string; revenue: number; orders: number }[];
}) {
  const max = Math.max(1, ...series.map((s) => s.revenue));
  const w = 100 / series.length;
  const label = (day: string) =>
    new Intl.DateTimeFormat("fa-IR-u-ca-persian", { day: "numeric", month: "short" }).format(
      new Date(`${day}T12:00:00+03:30`),
    );
  return (
    <figure>
      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        className="h-40 w-full"
        role="img"
        aria-label={series.map((s) => `${label(s.day)}: ${formatNumber(s.revenue)}`).join("، ")}
      >
        {series.map((s, i) => {
          const h = (s.revenue / max) * 38;
          return (
            <rect
              key={s.day}
              // راست‌به‌چپ: امروز سمت چپ، مثل خواندن تقویم فارسی از راست
              x={100 - (i + 1) * w + w * 0.15}
              y={40 - h}
              width={w * 0.7}
              height={Math.max(h, s.revenue ? 0.6 : 0.2)}
              rx={0.4}
              className={s.revenue ? "fill-copper" : "fill-line"}
            >
              <title>{`${label(s.day)}: ${formatNumber(s.revenue)} — ${formatNumber(s.orders)} سفارش`}</title>
            </rect>
          );
        })}
      </svg>
      <figcaption className="text-steel mt-1 flex justify-between text-xs">
        <span>{label(series[0]!.day)}</span>
        <span>{label(series[series.length - 1]!.day)}</span>
      </figcaption>
    </figure>
  );
}
