"use client";
/** عضویت خبرنامه در فوتر — تیک رضایت خالی (D-055) */
import { useActionState, useEffect } from "react";
import { track } from "@/lib/analytics";
import { fa } from "@/content/fa";
import { subscribe } from "@/modules/newsletter/actions";

export function NewsletterForm() {
  const t = fa.newsletter;
  const [state, action, pending] = useActionState(subscribe, null);
  useEffect(() => {
    if (state?.ok) track("newsletter_signup");
  }, [state]);
  return (
    <form action={action} className="space-y-2" aria-labelledby="nl-title">
      <h2 id="nl-title" className="text-sm font-bold">
        {t.title}
      </h2>
      <p className="text-ink-2 text-sm">{t.body}</p>
      {state?.ok ? (
        <p role="status" className="text-sm">
          {state.message}
        </p>
      ) : (
        <>
          <div className="flex gap-2">
            <label htmlFor="nl-contact" className="sr-only">
              {t.label}
            </label>
            <input
              id="nl-contact"
              name="contact"
              required
              maxLength={254}
              dir="ltr"
              autoComplete="email"
              placeholder={t.placeholder}
              className="rounded-ctl border-line bg-bg placeholder:text-steel focus:border-copper min-h-11 w-full border px-3 text-sm focus:outline-none"
            />
            <button
              type="submit"
              disabled={pending}
              className="rounded-ctl bg-copper text-copper-ink min-h-11 shrink-0 px-4 text-sm font-bold disabled:opacity-60"
            >
              {t.submit}
            </button>
          </div>
          <label className="text-ink-2 flex items-start gap-2 text-xs leading-6">
            <input type="checkbox" name="consent" className="mt-1.5" />
            {t.consent}
          </label>
          <p role="alert" className="min-h-5 text-xs text-[#f0a090]">
            {state && !state.ok ? state.message : ""}
          </p>
        </>
      )}
    </form>
  );
}
