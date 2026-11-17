"use client";
/** شمارش معکوس «پیشنهاد شگفت‌انگیز» (ساعت:دقیقه:ثانیه) */
import { useEffect, useState } from "react";
import { fa } from "@/content/fa";
import { remaining } from "@/modules/catalog/deals";

const two = (n: number) => n.toLocaleString("fa-IR", { minimumIntegerDigits: 2 });

export function Countdown({ endsAt, tone = "light" }: { endsAt: string; tone?: "light" | "dark" }) {
  const end = new Date(endsAt);
  // پیش از بارگذاری در مرورگر چیزی نمایش داده نمی‌شود تا زمان سرور و مرورگر ناهمخوان نشود
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);
  if (!now) return <span className="inline-block h-8 w-28" aria-hidden />;
  const r = remaining(end, now);
  if (r.done) return <span className="text-sm font-bold">{fa.deals.ended}</span>;
  const box = tone === "light" ? "bg-white text-[#c81e3a]" : "bg-[#c81e3a] text-white";
  return (
    <span
      role="timer"
      aria-label={fa.deals.remaining(r.h, r.m)}
      className="inline-flex items-center gap-1 font-bold tabular-nums"
      dir="ltr"
    >
      {[r.h, r.m, r.s].map((x, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <span aria-hidden>:</span>}
          <span className={`grid h-8 min-w-8 place-items-center rounded-lg px-1 text-sm ${box}`}>
            {two(x)}
          </span>
        </span>
      ))}
    </span>
  );
}
