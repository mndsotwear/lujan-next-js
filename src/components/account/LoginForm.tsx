"use client";
/** ورود دو مرحله‌ای: موبایل ← کد (FR-ACC-01). کد با autocomplete="one-time-code" از پیامک پر می‌شود. */
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fa } from "@/content/fa";
import { formatMobile, OTP } from "@/modules/account";
import { sendOtp, verifyOtp } from "@/modules/account/actions";
import { Captcha, type CaptchaValue } from "./Captcha";

export function LoginForm({ next, devMode }: { next?: string; devMode: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<"mobile" | "code">("mobile");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  // کپچا فقط وقتی سرور بخواهد (درخواست‌های پیاپی) — D-059
  const [needCaptcha, setNeedCaptcha] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaValue | null>(null);
  const [captchaRound, setCaptchaRound] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const request = async () => {
    setBusy(true);
    setError(null);
    const r = await sendOtp(mobile, captcha ?? undefined).catch(() => ({
      ok: false as const,
      message: fa.cart.errors.network,
      mobile: undefined,
      retryInSec: undefined,
      captcha: undefined,
    }));
    setBusy(false);
    if (r.captcha) {
      // هر پاسخ (درست یا غلط) چالش را مصرف می‌کند؛ تصویر تازه لازم است
      setNeedCaptcha(true);
      setCaptchaRound((n) => n + 1);
      setStep("mobile");
      return setError(r.message ?? fa.account.captcha.needed);
    }
    if (!r.ok || !r.mobile) return setError(r.message ?? fa.account.errors.mobile);
    setNeedCaptcha(false);
    setCaptcha(null);
    setMobile(r.mobile);
    setStep("code");
    setWait(r.retryInSec ?? OTP.resendAfterSec);
    setInfo(r.message ?? fa.account.codeSent(formatMobile(r.mobile)));
  };

  const verify = async (value = code) => {
    setBusy(true);
    setError(null);
    const r = await verifyOtp(mobile, value, next).catch(() => ({
      ok: false as const,
      message: fa.cart.errors.network,
      next: undefined,
    }));
    if (r.ok) {
      router.replace(r.next ?? "/account");
      router.refresh();
      return;
    }
    setBusy(false);
    setError(r.message ?? fa.account.errors.code);
  };

  const field =
    "min-h-12 w-full rounded-ctl border-[1.5px] border-line bg-surface px-3 text-lg focus:border-copper focus:outline-none";
  return (
    <div className="mx-auto w-full max-w-sm">
      {step === "mobile" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void request();
          }}
        >
          <label htmlFor="mobile" className="mb-1 block text-sm font-medium">
            {fa.account.mobile}
          </label>
          <input
            id="mobile"
            inputMode="tel"
            autoComplete="tel"
            placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className={field}
            aria-invalid={!!error}
            aria-describedby="login-msg"
            autoFocus
          />
          {needCaptcha && <Captcha onChange={setCaptcha} refreshKey={captchaRound} />}
          <button
            type="submit"
            disabled={busy}
            className="rounded-ctl bg-copper text-copper-ink mt-4 min-h-12 w-full font-bold disabled:opacity-60"
          >
            {busy ? fa.account.sending : fa.account.sendCode}
          </button>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void verify();
          }}
        >
          <p className="text-ink-2 mb-3 text-sm">{info}</p>
          {devMode && (
            <p className="rounded-ctl bg-copper-soft mb-3 px-3 py-2 text-xs">
              {fa.account.devHint}
            </p>
          )}
          <label htmlFor="code" className="mb-1 block text-sm font-medium">
            {fa.account.code}
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={OTP.length + 4}
            dir="ltr"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              const digits = e.target.value.replace(/[^\d۰-۹٠-٩]/g, "");
              if (digits.length === OTP.length && !busy) void verify(e.target.value);
            }}
            className={`${field} text-center tracking-[0.5em]`}
            aria-invalid={!!error}
            aria-describedby="login-msg"
            autoFocus
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-ctl bg-copper text-copper-ink mt-4 min-h-12 w-full font-bold disabled:opacity-60"
          >
            {busy ? fa.account.verifying : fa.account.verify}
          </button>
          <div className="mt-3 flex justify-between text-sm">
            <button
              type="button"
              onClick={() => (setStep("mobile"), setCode(""), setError(null))}
              className="text-ink-2 underline underline-offset-4"
            >
              {fa.account.editMobile}
            </button>
            {wait > 0 ? (
              <span className="text-steel">{fa.account.resendIn(wait)}</span>
            ) : (
              <button type="button" onClick={() => void request()} className="text-copper">
                {fa.account.resend}
              </button>
            )}
          </div>
        </form>
      )}
      <p id="login-msg" role="alert" className="text-bad mt-3 min-h-5 text-sm">
        {error ?? ""}
      </p>
      <p className="text-steel mt-2 text-xs">{fa.account.terms}</p>
    </div>
  );
}
