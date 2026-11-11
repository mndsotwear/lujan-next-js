"use client";
import { useActionState } from "react";
import { fa } from "@/content/fa";
import type { NotifyState } from "@/modules/catalog";

type Action = (prev: NotifyState, form: FormData) => Promise<NotifyState>;

/** «موجود شد خبرم کن» (FR-CAT-04) */
export function NotifyForm({ variantId, action }: { variantId: string; action: Action }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="rounded-card border-line bg-surface-2 border p-4">
      <p className="font-bold">{fa.product.notifyTitle}</p>
      <p className="text-ink-2 mb-3 text-sm">{fa.product.notifyBody}</p>
      <input type="hidden" name="variantId" value={variantId} />
      <div className="flex gap-2 max-sm:flex-col">
        <label htmlFor="notify-mobile" className="sr-only">
          {fa.product.notifyMobile}
        </label>
        <input
          id="notify-mobile"
          name="mobile"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹"
          required
          aria-describedby="notify-msg"
          className="rounded-ctl border-line bg-surface min-h-12 flex-1 border-[1.5px] px-3"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-ctl border-ink min-h-12 border-[1.5px] px-4 font-bold disabled:opacity-50"
        >
          {fa.product.notifySubmit}
        </button>
      </div>
      <p
        id="notify-msg"
        role="status"
        className={`mt-2 min-h-5 text-sm ${state?.ok ? "text-ok" : "text-bad"}`}
      >
        {state?.message ?? ""}
      </p>
    </form>
  );
}
