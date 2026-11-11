"use client";
/** فعال‌سازی کارمند — رمز، اتصال اپ کدساز و کدهای پشتیبان (D-035) */
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { fa } from "@/content/fa";
import { completeSetup } from "@/modules/admin/actions";
import { btnPrimary, card, inputCls } from "./ui";

export function SetupForm({
  qr,
  manualKey,
  done = false,
}: {
  qr: string;
  manualKey: string;
  done?: boolean;
}) {
  const t = fa.admin.activate;
  const router = useRouter();
  const [state, action, pending] = useActionState(completeSetup, null);

  if (state?.ok && state.recovery)
    return (
      <div className={`${card} space-y-4 p-6`}>
        <h1 className="text-xl font-bold">{t.recoveryTitle}</h1>
        <p className="text-ink-2 text-sm leading-7">{t.recoveryBody}</p>
        <ol dir="ltr" className="bg-surface-2 rounded-ctl grid grid-cols-2 gap-2 p-4 font-mono">
          {state.recovery.map((c) => (
            <li key={c} className="select-all">
              {c}
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => {
            router.replace("/admin");
            router.refresh();
          }}
          className={`${btnPrimary} w-full`}
        >
          {t.done}
        </button>
      </div>
    );

  if (done)
    return (
      <div className={`${card} space-y-4 p-6`}>
        <p>{t.alreadyDone}</p>
        <button
          type="button"
          onClick={() => router.replace("/admin")}
          className={`${btnPrimary} w-full`}
        >
          {t.done}
        </button>
      </div>
    );

  return (
    <form action={action} className={`${card} space-y-5 p-6`}>
      <h1 className="text-xl font-bold">{t.setupTitle}</h1>
      <fieldset className="space-y-3">
        <legend className="text-ink-2 mb-2 text-sm leading-7">{t.step1}</legend>
        <label htmlFor="set-pw" className="sr-only">
          {t.password}
        </label>
        <input
          id="set-pw"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder={t.password}
          required
          minLength={12}
          dir="ltr"
          className={inputCls}
        />
        <label htmlFor="set-pw2" className="sr-only">
          {t.passwordRepeat}
        </label>
        <input
          id="set-pw2"
          name="password2"
          type="password"
          autoComplete="new-password"
          placeholder={t.passwordRepeat}
          required
          dir="ltr"
          className={inputCls}
        />
      </fieldset>
      <div className="space-y-2">
        <p className="text-ink-2 text-sm leading-7">{t.step2}</p>
        <div
          className="mx-auto w-[200px] rounded-[8px] bg-white p-2"
          // SVG ساخته‌شده روی سرور از کتابخانه‌ی qrcode، بدون ورودی کاربر
          dangerouslySetInnerHTML={{ __html: qr }}
        />
        <p className="text-steel text-xs">{t.manualKey}</p>
        <p
          dir="ltr"
          className="bg-surface-2 rounded-ctl p-2 text-center font-mono text-sm select-all"
        >
          {manualKey}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="set-code" className="text-ink-2 text-sm leading-7">
          {t.step3}
        </label>
        <input
          id="set-code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          dir="ltr"
          className={`${inputCls} text-center text-lg tracking-[0.3em]`}
        />
      </div>
      <p role="alert" className="text-bad min-h-5 text-sm">
        {state && !state.ok ? state.message : ""}
      </p>
      <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
        {t.finish}
      </button>
    </form>
  );
}
