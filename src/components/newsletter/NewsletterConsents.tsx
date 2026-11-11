"use client";
/** تنظیم پیام‌های تبلیغاتی در اطلاعات حساب (D-055) */
import { useActionState } from "react";
import { fa } from "@/content/fa";
import { saveMyConsents } from "@/modules/newsletter/actions";

export function NewsletterConsents({
  sms,
  email,
  hasEmail,
}: {
  sms: boolean;
  email: boolean;
  hasEmail: boolean;
}) {
  const t = fa.newsletter;
  const [state, action, pending] = useActionState(saveMyConsents, null);
  return (
    <form action={action} className="rounded-card border-line bg-surface space-y-3 border p-5">
      <h2 className="font-bold">{t.account}</h2>
      <p className="text-steel text-sm">{t.accountHint}</p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="sms" defaultChecked={sms} /> {t.smsOpt}
      </label>
      <label className={`flex items-center gap-2 text-sm ${hasEmail ? "" : "text-steel"}`}>
        <input type="checkbox" name="email" defaultChecked={email} disabled={!hasEmail} />{" "}
        {t.emailOpt}
      </label>
      {!hasEmail && <p className="text-steel text-xs">{t.emailMissing}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-ctl bg-ink text-bg min-h-11 px-5 font-bold disabled:opacity-60"
        >
          {t.save}
        </button>
        <span role="status" className={`text-sm ${state?.ok ? "text-ok" : "text-bad"}`}>
          {state?.message ?? ""}
        </span>
      </div>
    </form>
  );
}
