"use client";
/** کنترل‌های اپراتور در جزئیات سفارش (FR-ADM-04) */
import { useState, useTransition } from "react";
import { fa } from "@/content/fa";
import type { AdminResult, OrderStatus } from "@/modules/checkout";
import {
  addTracking,
  approveCancel,
  cancelOrder,
  recordRefund,
  rejectCancel,
  requestCancel,
  saveOrderNote,
  setOrderStatus,
} from "@/modules/checkout/admin-actions";
import { btnGhost, btnPrimary, inputCls } from "./ui";

const t = fa.admin.orders;

function useRun() {
  const [msg, setMsg] = useState<AdminResult | null>(null);
  const [busy, start] = useTransition();
  const run = (fn: () => Promise<AdminResult>, after?: () => void) =>
    start(async () => {
      const r = await fn().catch(() => ({ ok: false, message: fa.cart.errors.network }));
      setMsg(r);
      if (r.ok) after?.();
    });
  const Msg = () => (
    <p role="status" className={`min-h-5 text-sm ${msg?.ok ? "text-ok" : "text-bad"}`}>
      {msg?.message ?? ""}
    </p>
  );
  return { run, busy, Msg };
}

export function StatusActions({
  number,
  next,
  needsCode,
  canCancel,
  pending,
}: {
  number: number;
  next: OrderStatus[];
  needsCode: boolean;
  /** مدیر کل (D-039) */
  canCancel: boolean;
  /** درخواست لغو باز */
  pending: { reason: string; by: string } | null;
}) {
  const { run, busy, Msg } = useRun();
  const [code, setCode] = useState("");
  const [reason, setReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const forward = next.filter((s) => s !== "CANCELLED");
  const cancellable = next.includes("CANCELLED");

  if (pending)
    return (
      <div className="space-y-3">
        <div className="rounded-ctl bg-copper/10 border-copper border p-3 text-sm">
          <b>{t.pendingTitle}</b>
          <p className="mt-1">{pending.reason}</p>
          <small className="text-ink-2">{t.pendingBy(pending.by)}</small>
        </div>
        {canCancel && (
          <>
            <label htmlFor="rej-note" className="sr-only">
              {t.rejectNote}
            </label>
            <input
              id="rej-note"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.rejectNote}
              className={`${inputCls} min-h-10`}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(t.confirmCancel)) run(() => approveCancel(number));
                }}
                className={`${btnPrimary} bg-bad`}
              >
                {t.approveCancel}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => rejectCancel(number, reason))}
                className={btnGhost}
              >
                {t.rejectCancel}
              </button>
            </div>
          </>
        )}
        <Msg />
      </div>
    );

  if (!next.length) return <p className="text-ink-2 text-sm">{t.noActions}</p>;
  return (
    <div className="space-y-3">
      {forward.includes("SHIPPED") && (
        <div className="flex flex-col gap-1">
          <label htmlFor="ship-code" className="text-sm font-medium">
            {t.trackingCode}
            {needsCode ? " *" : ""}
          </label>
          <input
            id="ship-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            dir="ltr"
            className={inputCls}
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {forward.map((to) => (
          <button
            key={to}
            type="button"
            disabled={busy}
            onClick={() => run(() => setOrderStatus(number, to, code))}
            className={btnPrimary}
          >
            {t.to[to]}
          </button>
        ))}
        {cancellable && !showCancel && (
          <button
            type="button"
            onClick={() => setShowCancel(true)}
            className={`${btnGhost} text-bad`}
          >
            {canCancel ? t.cancelNow : t.requestCancel}
          </button>
        )}
      </div>
      {showCancel && (
        <div className="space-y-2">
          <label htmlFor="cancel-reason" className="text-sm font-medium">
            {t.cancelReason}
          </label>
          <input
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={`${inputCls} min-h-10`}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (canCancel) {
                if (window.confirm(t.confirmCancel)) run(() => cancelOrder(number, reason));
              } else run(() => requestCancel(number, reason));
            }}
            className={`${btnGhost} text-bad`}
          >
            {canCancel ? t.cancelNow : t.requestCancel}
          </button>
        </div>
      )}
      <Msg />
    </div>
  );
}

export function TrackingForm({ number }: { number: number }) {
  const { run, busy, Msg } = useRun();
  const [code, setCode] = useState("");
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <label htmlFor="add-code" className="sr-only">
          {t.trackingCode}
        </label>
        <input
          id="add-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t.trackingCode}
          dir="ltr"
          className={`${inputCls} min-h-10`}
        />
        <button
          type="button"
          disabled={busy || !code.trim()}
          onClick={() =>
            run(
              () => addTracking(number, code),
              () => setCode(""),
            )
          }
          className={btnGhost}
        >
          {t.addTracking}
        </button>
      </div>
      <Msg />
    </div>
  );
}

export function NoteForm({ number, initial }: { number: number; initial: string }) {
  const { run, busy, Msg } = useRun();
  const [note, setNote] = useState(initial);
  return (
    <div className="space-y-2">
      <label htmlFor="o-note" className="font-bold">
        {t.note}
      </label>
      <textarea
        id="o-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        maxLength={2000}
        aria-describedby="o-note-hint"
        className={`${inputCls} py-2`}
      />
      <div className="flex items-center justify-between gap-2">
        <small id="o-note-hint" className="text-steel text-xs">
          {t.noteHint}
        </small>
        <button
          type="button"
          disabled={busy || note === initial}
          onClick={() => run(() => saveOrderNote(number, note))}
          className={btnGhost}
        >
          {t.saveNote}
        </button>
      </div>
      <Msg />
    </div>
  );
}

export function RefundForm({
  number,
  max,
  suggested,
  onSubmit,
}: {
  number: number;
  max: number;
  suggested?: number;
  onSubmit?: (amount: string, ref: string) => Promise<AdminResult>;
}) {
  const { run, busy, Msg } = useRun();
  const [amount, setAmount] = useState(suggested ? String(Math.min(suggested, max)) : "");
  const [ref, setRef] = useState("");
  return (
    <div className="space-y-2">
      <p className="text-ink-2 text-xs">{t.refundHint}</p>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <label className="sr-only" htmlFor={`rf-amount-${number}`}>
          {t.refundAmount}
        </label>
        <input
          id={`rf-amount-${number}`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="numeric"
          placeholder={t.refundAmount}
          dir="ltr"
          className={`${inputCls} min-h-10`}
        />
        <label className="sr-only" htmlFor={`rf-ref-${number}`}>
          {t.refundRef}
        </label>
        <input
          id={`rf-ref-${number}`}
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder={t.refundRef}
          dir="ltr"
          className={`${inputCls} min-h-10`}
        />
        <button
          type="button"
          disabled={busy || !amount || !ref}
          onClick={() =>
            run(() => (onSubmit ? onSubmit(amount, ref) : recordRefund(number, amount, ref)))
          }
          className={btnPrimary}
        >
          {t.refundBtn}
        </button>
      </div>
      <Msg />
    </div>
  );
}
