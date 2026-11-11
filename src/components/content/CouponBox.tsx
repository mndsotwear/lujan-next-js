"use client";
/** نمایش کد تخفیف کمپین با دکمه‌ی کپی */
import { useState } from "react";
import { fa } from "@/content/fa";

export function CouponBox({ code }: { code: string }) {
  const t = fa.landing;
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-card border-copper bg-copper-soft/40 flex flex-wrap items-center gap-4 border-2 border-dashed p-4">
      <div>
        <p className="text-ink-2 text-sm">{t.coupon}</p>
        <p dir="ltr" className="text-2xl font-black tracking-widest select-all">
          {code}
        </p>
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            // مرورگر اجازه‌ی کپی نداد؛ متن قابل انتخاب است
          }
        }}
        className="rounded-ctl bg-ink text-bg min-h-11 px-4 font-bold"
      >
        <span aria-live="polite">{copied ? t.copied : t.copy}</span>
      </button>
      <p className="text-steel w-full text-xs">{t.couponHint}</p>
    </div>
  );
}
