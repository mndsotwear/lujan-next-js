"use client";
/** فرم پرسش و نظر در صفحه‌ی محصول (FR-CAT-06، D-040) */
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { fa } from "@/content/fa";
import { askQuestion, feedbackStatus, submitReview } from "@/modules/catalog/feedback-actions";

type Status = Awaited<ReturnType<typeof feedbackStatus>>;
const box = "rounded-card border-line bg-surface mt-4 border p-4";
const field =
  "rounded-ctl border-line bg-surface focus:border-copper w-full border-[1.5px] px-3 py-2 focus:outline-none";
const btn =
  "rounded-ctl border-ink min-h-11 border-[1.5px] px-4 text-sm font-bold disabled:opacity-50";

function useStatus(productId: string) {
  const [s, setS] = useState<Status | null>(null);
  useEffect(() => {
    let alive = true;
    feedbackStatus(productId)
      .then((r) => alive && setS(r))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [productId]);
  return s;
}

export function AskQuestion({ productId, slug }: { productId: string; slug: string }) {
  const t = fa.product.ask;
  const s = useStatus(productId);
  const [state, action, pending] = useActionState(askQuestion, null);
  if (!s) return null;
  if (!s.loggedIn)
    return (
      <Link
        href={`/login?next=${encodeURIComponent(`/products/${slug}#qa`)}`}
        className="text-copper mt-4 inline-block text-sm underline"
      >
        {t.login}
      </Link>
    );
  if (state?.ok) return <p className="text-ok mt-4 text-sm">{state.message}</p>;
  return (
    <form action={action} className={box}>
      <input type="hidden" name="productId" value={productId} />
      <label htmlFor="ask-body" className="mb-1 block font-bold">
        {t.title}
      </label>
      <textarea
        id="ask-body"
        name="body"
        required
        minLength={10}
        maxLength={500}
        rows={2}
        aria-describedby="ask-hint"
        className={field}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <small id="ask-hint" className="text-steel text-xs">
          {t.hint}
        </small>
        <button type="submit" disabled={pending} className={btn}>
          {t.submit}
        </button>
      </div>
      {state && !state.ok && <p className="text-bad mt-2 text-sm">{state.message}</p>}
    </form>
  );
}

export function WriteReview({ productId }: { productId: string }) {
  const t = fa.product.review;
  const s = useStatus(productId);
  const [state, action, pending] = useActionState(submitReview, null);
  if (!s?.canReview) return null;
  if (state?.ok) return <p className="text-ok mt-4 text-sm">{state.message}</p>;
  return (
    <form action={action} className={box}>
      <input type="hidden" name="productId" value={productId} />
      <fieldset>
        <legend className="mb-2 font-bold">{t.title}</legend>
        <div className="flex flex-wrap gap-3" role="radiogroup" aria-label={t.rating}>
          {[5, 4, 3, 2, 1].map((n) => (
            <label key={n} className="flex items-center gap-1 text-sm">
              <input
                type="radio"
                name="rating"
                value={n}
                required
                className="accent-copper size-4"
              />
              {fa.admin.inbox.stars(n)}
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor="rev-body" className="mt-3 mb-1 block text-sm">
        {t.body}
      </label>
      <textarea id="rev-body" name="body" maxLength={1000} rows={2} className={field} />
      <button type="submit" disabled={pending} className={`${btn} mt-2`}>
        {t.submit}
      </button>
      {state && !state.ok && <p className="text-bad mt-2 text-sm">{state.message}</p>}
    </form>
  );
}
