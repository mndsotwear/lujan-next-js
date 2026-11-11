"use client";
/** پاسخ به پرسش و تأیید نظر در صندوق ورودی (FR-ADM-08) */
import { useState, useTransition } from "react";
import { fa } from "@/content/fa";
import { answerQuestion, moderateReview, rejectQuestion } from "@/modules/catalog/admin-feedback";
import type { AdminResult } from "@/modules/checkout";
import { btnGhost, btnPrimary, inputCls } from "./ui";

const t = fa.admin.inbox;

function useRun() {
  const [msg, setMsg] = useState<AdminResult | null>(null);
  const [busy, start] = useTransition();
  return {
    busy,
    msg,
    run: (fn: () => Promise<AdminResult>) =>
      start(async () =>
        setMsg(await fn().catch(() => ({ ok: false, message: fa.cart.errors.network }))),
      ),
  };
}

export function AnswerForm({ id }: { id: string }) {
  const [answer, setAnswer] = useState("");
  const { busy, msg, run } = useRun();
  if (msg?.ok) return <p className="text-ok text-sm">{msg.message}</p>;
  return (
    <div className="space-y-2">
      <label htmlFor={`ans-${id}`} className="sr-only">
        {t.answer}
      </label>
      <textarea
        id={`ans-${id}`}
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder={t.answer}
        className={`${inputCls} py-2`}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => answerQuestion(id, answer))}
          className={btnPrimary}
        >
          {t.publish}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => rejectQuestion(id))}
          className={`${btnGhost} text-bad`}
        >
          {t.rejectQuestion}
        </button>
      </div>
      {msg && !msg.ok && <p className="text-bad text-sm">{msg.message}</p>}
    </div>
  );
}

export function ReviewButtons({ id }: { id: string }) {
  const { busy, msg, run } = useRun();
  if (msg?.ok) return <p className="text-ok text-sm">{msg.message}</p>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => run(() => moderateReview(id, true))}
        className={btnPrimary}
      >
        {t.approveReview}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => run(() => moderateReview(id, false))}
        className={`${btnGhost} text-bad`}
      >
        {t.rejectReview}
      </button>
      {msg && !msg.ok && <span className="text-bad text-sm">{msg.message}</span>}
    </div>
  );
}
