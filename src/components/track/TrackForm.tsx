"use client";
/** پیگیری سفارش مهمان با شماره‌ی سفارش و موبایل (FR-SHP-05، D-031) */
import Link from "next/link";
import { useState } from "react";
import { fa } from "@/content/fa";
import { formatOrderNumber } from "@/lib/format";
import type { TrackResult } from "@/modules/checkout";
import { trackOrder } from "@/modules/checkout/actions";
import { TrackTimeline } from "./TrackTimeline";

const date = (iso: string) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "long" }).format(new Date(iso));

export function TrackForm({ initialNumber }: { initialNumber?: string }) {
  const t = fa.track;
  const [result, setResult] = useState<TrackResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const r = await trackOrder(String(f.get("number") ?? ""), String(f.get("mobile") ?? "")).catch(
      () => ({ ok: false as const, message: fa.cart.errors.network }),
    );
    setResult(r);
    setBusy(false);
  }

  const input =
    "rounded-ctl border-line bg-surface focus:border-copper min-h-12 w-full border-[1.5px] px-3 focus:outline-none";
  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="rounded-card border-line bg-surface grid gap-4 border p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="track-number" className="text-sm font-medium">
            {t.number}
          </label>
          <input
            id="track-number"
            name="number"
            inputMode="numeric"
            required
            defaultValue={initialNumber}
            placeholder="۱۰۰۱"
            className={input}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="track-mobile" className="text-sm font-medium">
            {t.mobile}
          </label>
          <input
            id="track-mobile"
            name="mobile"
            inputMode="numeric"
            autoComplete="tel"
            required
            placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹"
            className={input}
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-ctl bg-ink text-bg min-h-12 px-6 font-bold disabled:opacity-60"
        >
          {busy ? t.checking : t.submit}
        </button>
      </form>
      <div role="status" aria-live="polite">
        {result && !result.ok && <p className="text-bad text-sm">{result.message}</p>}
        {result?.ok && (
          <section className="rounded-card border-line bg-surface space-y-4 border p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold">{t.result(formatOrderNumber(result.number))}</h2>
              <span className="text-ink-2 text-sm">
                {t.placedAt}: {date(result.createdAt)} · {t.items(result.itemCount)} ·{" "}
                {fa.checkout.methods[result.shippingMethod]}
              </span>
            </div>
            <TrackTimeline
              status={result.status}
              method={result.shippingMethod}
              shipments={result.shipments}
            />
            {result.isOwner && (
              <Link
                href={`/account/orders/${result.number}`}
                className="text-copper text-sm font-medium underline"
              >
                {t.viewDetails}
              </Link>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
