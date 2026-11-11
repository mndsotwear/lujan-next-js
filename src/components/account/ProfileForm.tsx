"use client";
/** اطلاعات حساب، فاکتور و رضایت‌نامه‌ی ارتباطات (FR-ACC-02, FR-ACC-06) */
import { useActionState } from "react";
import { fa } from "@/content/fa";
import type { FormState } from "@/modules/account";
import { updateProfile } from "@/modules/account/actions";
import { Field } from "./Field";

type Profile = {
  name: string;
  email: string;
  refundIban: string;
  invoice: { companyName: string; nationalId: string; economicCode: string };
};

export function ProfileForm({ profile, compact = false }: { profile: Profile; compact?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, {
    ok: false,
  });
  const e = state.errors ?? {};
  const f = fa.account.fields;
  const val = (k: string, fallback: string) => state.values?.[k] ?? fallback;
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="name"
          label={f.name}
          defaultValue={val("name", profile.name)}
          error={e.name}
          autoComplete="name"
          required
        />
        <Field
          name="email"
          label={f.email}
          defaultValue={val("email", profile.email)}
          error={e.email}
          type="email"
          inputMode="email"
          dir="ltr"
          autoComplete="email"
        />
      </div>
      {!compact && (
        <>
          <fieldset className="rounded-card border-line grid gap-4 border p-4">
            <legend className="px-1 font-bold">{fa.account.invoiceTitle}</legend>
            <p className="text-steel -mt-2 text-xs">{fa.account.invoiceHint}</p>
            <Field
              name="companyName"
              label={f.companyName}
              defaultValue={val("companyName", profile.invoice.companyName)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                name="nationalId"
                label={f.nationalId}
                defaultValue={val("nationalId", profile.invoice.nationalId)}
                inputMode="numeric"
                dir="ltr"
              />
              <Field
                name="economicCode"
                label={f.economicCode}
                defaultValue={val("economicCode", profile.invoice.economicCode)}
                inputMode="numeric"
                dir="ltr"
              />
            </div>
          </fieldset>
          <fieldset className="rounded-card border-line grid gap-2 border p-4">
            <legend className="px-1 font-bold">{fa.account.ibanTitle}</legend>
            <Field
              name="refundIban"
              label={fa.account.ibanLabel}
              defaultValue={val("refundIban", profile.refundIban)}
              error={e.refundIban}
              dir="ltr"
              autoComplete="off"
            />
            <p className="text-steel text-xs">{fa.account.ibanHint}</p>
          </fieldset>
          {/* رضایت پیام تبلیغاتی از M1.10b در بخش جدای «پیام‌های تبلیغاتی» (خبرنامه، D-055) */}
        </>
      )}
      {compact && (
        <>
          <input type="hidden" name="companyName" value={profile.invoice.companyName} />
          <input type="hidden" name="nationalId" value={profile.invoice.nationalId} />
          <input type="hidden" name="economicCode" value={profile.invoice.economicCode} />
        </>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-ctl bg-copper text-copper-ink min-h-12 px-6 font-bold disabled:opacity-60"
        >
          {fa.account.save}
        </button>
        <p role="status" className="text-ok text-sm">
          {state.ok ? state.message : ""}
        </p>
      </div>
    </form>
  );
}
