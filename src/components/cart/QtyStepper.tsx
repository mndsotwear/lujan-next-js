"use client";
import { fa } from "@/content/fa";
import { formatNumber } from "@/lib/format";

export function QtyStepper({
  value,
  max,
  onChange,
  size = "sm",
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
  size?: "sm" | "md";
}) {
  const h = size === "md" ? "h-12 w-10" : "h-8 w-8";
  return (
    <div className="rounded-ctl border-line inline-flex items-center border">
      <button
        type="button"
        aria-label={fa.cart.decrease}
        onClick={() => onChange(value - 1)}
        className={`${h} text-lg`}
      >
        −
      </button>
      <output aria-live="polite" className="min-w-7 text-center text-sm">
        {formatNumber(value)}
      </output>
      <button
        type="button"
        aria-label={fa.cart.increase}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className={`${h} text-lg disabled:opacity-30`}
      >
        +
      </button>
    </div>
  );
}
