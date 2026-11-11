"use client";
/** ورود کارکنان: رمز ← کد اپ کدساز (D-035) */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fa } from "@/content/fa";
import { loginPassword, loginSecondFactor } from "@/modules/admin/actions";
import { btnPrimary, card, inputCls } from "./ui";

export function AdminLoginForm() {
  const t = fa.admin.login;
  const router = useRouter();
  const [step, setStep] = useState<"password" | "code">("password");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const r = await (
      step === "password"
        ? loginPassword(String(f.get("mobile") ?? ""), String(f.get("password") ?? ""))
        : loginSecondFactor(String(f.get("code") ?? ""))
    ).catch(() => ({ ok: false, message: fa.cart.errors.network }) as const);
    setBusy(false);
    if (!r.ok) {
      setError(r.message ?? t.errors.invalid);
      if (r.message === t.errors.expired) setStep("password");
      return;
    }
    if ("step" in r && r.step === "code") setStep("code");
    else if ("redirect" in r && r.redirect) {
      router.replace(r.redirect);
      router.refresh();
    }
  }

  return (
    <div className={`${card} p-6`}>
      <h1 className="mb-5 text-xl font-bold">{t.title}</h1>
      <form onSubmit={(e) => void submit(e)} className="space-y-4" key={step}>
        {step === "password" ? (
          <>
            <div className="flex flex-col gap-1">
              <label htmlFor="adm-mobile" className="text-sm font-medium">
                {t.mobile}
              </label>
              <input
                id="adm-mobile"
                name="mobile"
                inputMode="numeric"
                autoComplete="username"
                required
                dir="ltr"
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="adm-password" className="text-sm font-medium">
                {t.password}
              </label>
              <input
                id="adm-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                dir="ltr"
                className={inputCls}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-1">
            <label htmlFor="adm-code" className="text-sm font-medium">
              {t.code}
            </label>
            <input
              id="adm-code"
              name="code"
              autoComplete="one-time-code"
              inputMode="text"
              required
              autoFocus
              dir="ltr"
              aria-describedby="adm-code-hint"
              className={`${inputCls} text-center text-lg tracking-[0.3em]`}
            />
            <small id="adm-code-hint" className="text-steel text-xs leading-6">
              {t.codeHint}
            </small>
          </div>
        )}
        <p role="alert" className="text-bad min-h-5 text-sm">
          {error ?? ""}
        </p>
        <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
          {busy ? t.checking : step === "password" ? t.next : t.submit}
        </button>
        {step === "code" && (
          <button
            type="button"
            onClick={() => setStep("password")}
            className="text-ink-2 w-full text-sm underline"
          >
            {t.back}
          </button>
        )}
      </form>
      {step === "password" && (
        <Link href="/admin/activate" className="text-copper mt-5 inline-block text-sm underline">
          {t.firstTime}
        </Link>
      )}
    </div>
  );
}
