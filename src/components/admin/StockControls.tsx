"use client";
/** ثبت ورود/خروج و آستانه برای یک SKU (FR-INV-03, FR-INV-04) */
import { useState, useTransition } from "react";
import { fa } from "@/content/fa";
import { ADJUST_REASONS } from "@/modules/inventory";
import { adjustStock, setThreshold, type InvResult } from "@/modules/inventory/actions";
import { btnGhost, btnPrimary, inputCls } from "./ui";

const t = fa.admin.inventory;

export function StockControls({
  variantId,
  threshold,
  safety,
}: {
  variantId: string;
  threshold: number;
  safety: number;
}) {
  const [reason, setReason] = useState<string>("PURCHASE");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [th, setTh] = useState(String(threshold));
  const [sf, setSf] = useState(String(safety));
  const [msg, setMsg] = useState<InvResult | null>(null);
  const [busy, start] = useTransition();
  const run = (fn: () => Promise<InvResult>, after?: () => void) =>
    start(async () => {
      const r = await fn().catch(() => ({ ok: false, message: fa.cart.errors.network }));
      setMsg(r);
      if (r.ok) after?.();
    });
  const id = variantId.slice(-6);
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[1.2fr_0.6fr_1.4fr_auto] sm:items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor={`r-${id}`} className="text-xs font-medium">
            {t.reason}
          </label>
          <select
            id={`r-${id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={`${inputCls} min-h-10 text-sm`}
          >
            {ADJUST_REASONS.map((r) => (
              <option key={r} value={r}>
                {t.reasons[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`q-${id}`} className="text-xs font-medium">
            {t.qty}
          </label>
          <input
            id={`q-${id}`}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            inputMode="numeric"
            dir="ltr"
            className={`${inputCls} min-h-10 text-sm`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`n-${id}`} className="text-xs font-medium">
            {t.note}
          </label>
          <input
            id={`n-${id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.noteHint}
            className={`${inputCls} min-h-10 text-sm`}
          />
        </div>
        <button
          type="button"
          disabled={busy || !qty}
          onClick={() =>
            run(
              () => adjustStock(variantId, reason, qty, note),
              () => {
                setQty("");
                setNote("");
              },
            )
          }
          className={btnPrimary}
        >
          {t.submit}
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`th-${id}`} className="text-xs font-medium">
            {t.threshold}
          </label>
          <input
            id={`th-${id}`}
            value={th}
            onChange={(e) => setTh(e.target.value)}
            inputMode="numeric"
            className={`${inputCls} min-h-10 w-28 text-sm`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`sf-${id}`} className="text-xs font-medium">
            {t.safety}
          </label>
          <input
            id={`sf-${id}`}
            value={sf}
            onChange={(e) => setSf(e.target.value)}
            inputMode="numeric"
            className={`${inputCls} min-h-10 w-28 text-sm`}
          />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => setThreshold(variantId, th, sf))}
          className={btnGhost}
        >
          {t.saveThreshold}
        </button>
      </div>
      <p role="status" className={`min-h-5 text-sm ${msg?.ok ? "text-ok" : "text-bad"}`}>
        {msg?.message ?? ""}
      </p>
    </div>
  );
}
