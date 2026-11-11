"use client";
/** گردش‌کار مرجوعی برای اپراتور (FR-RET-02) */
import { useState, useTransition } from "react";
import { fa } from "@/content/fa";
import type { AdminResult } from "@/modules/checkout";
import {
  decideReturn,
  exchangeReturn,
  receiveReturn,
  refundReturn,
} from "@/modules/returns/admin-actions";
import { RefundForm } from "./OrderControls";
import { btnGhost, btnPrimary, inputCls } from "./ui";

export function ReturnControls({
  id,
  orderNumber,
  status,
  type,
  maxRefund,
  suggested,
}: {
  id: string;
  orderNumber: number;
  status: string;
  type: "REFUND" | "EXCHANGE";
  maxRefund: number;
  suggested: number;
}) {
  const t = fa.admin.returns;
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<AdminResult | null>(null);
  const [busy, start] = useTransition();
  const run = (fn: () => Promise<AdminResult>) =>
    start(async () =>
      setMsg(await fn().catch(() => ({ ok: false, message: fa.cart.errors.network }))),
    );

  const msgEl = (
    <p role="status" className={`min-h-5 text-sm ${msg?.ok ? "text-ok" : "text-bad"}`}>
      {msg?.message ?? ""}
    </p>
  );

  if (status === "REQUESTED" || status === "APPROVED")
    return (
      <div className="space-y-3">
        {status === "REQUESTED" && (
          <>
            <label htmlFor="ret-note" className="text-sm font-medium">
              {t.note}
            </label>
            <textarea
              id="ret-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={1000}
              aria-describedby="ret-note-hint"
              className={`${inputCls} py-2`}
            />
            <small id="ret-note-hint" className="text-steel block text-xs">
              {t.noteHint}
            </small>
          </>
        )}
        <div className="flex flex-wrap gap-2">
          {status === "REQUESTED" ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => decideReturn(id, true, note))}
                className={btnPrimary}
              >
                {t.approve}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => decideReturn(id, false, note))}
                className={`${btnGhost} text-bad`}
              >
                {t.reject}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => receiveReturn(id, true))}
                className={btnPrimary}
              >
                {t.receivedOk}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => receiveReturn(id, false))}
                className={btnGhost}
              >
                {t.receivedDamaged}
              </button>
            </>
          )}
        </div>
        {msgEl}
      </div>
    );

  if (status === "RECEIVED")
    return (
      <div className="space-y-4">
        {type === "EXCHANGE" && (
          <div className="space-y-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => exchangeReturn(id, note))}
              className={btnPrimary}
            >
              {t.exchange}
            </button>
            {msgEl}
          </div>
        )}
        <div>
          <p className="mb-1 text-sm font-medium">{t.refund}</p>
          <p className="text-ink-2 mb-2 text-xs">
            {t.suggested(suggested.toLocaleString("fa-IR"))}
          </p>
          <RefundForm
            number={orderNumber}
            max={maxRefund}
            suggested={suggested}
            onSubmit={(amount, ref) => refundReturn(id, amount, ref)}
          />
        </div>
      </div>
    );

  return <p className="text-ink-2 text-sm">{t.finished}</p>;
}
