"use client";
/** حذف حساب با کد پیامکی تازه (FR-ACC-06، D-022 بند ۲) */
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { fa } from "@/content/fa";
import { formatMobile, type FormState } from "@/modules/account";
import { deleteAccount, requestDeleteCode } from "@/modules/account/actions";
import { Captcha, type CaptchaValue } from "./Captcha";

export function DeleteAccount() {
  const router = useRouter();
  const [state, action, pending] = useActionState<FormState, FormData>(deleteAccount, {
    ok: false,
  });
  const [sent, setSent] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [needCaptcha, setNeedCaptcha] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaValue | null>(null);
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (state.ok) router.replace("/");
  }, [state.ok, router]);

  const send = async () => {
    setSending(true);
    setNote(null);
    const r = await requestDeleteCode(captcha ?? undefined).catch(() => ({
      ok: false,
      message: fa.cart.errors.network,
      mobile: undefined,
      captcha: undefined,
    }));
    setSending(false);
    if (r.captcha) {
      setNeedCaptcha(true);
      setRound((n) => n + 1);
      return setNote(r.message ?? fa.account.captcha.needed);
    }
    if (!r.ok || !r.mobile) return setNote(r.message ?? fa.account.errors.smsFailed);
    setNeedCaptcha(false);
    setSent(r.mobile);
    setNote(r.message ?? null);
  };

  return (
    <form action={action} className="rounded-card border-bad/40 border p-4">
      <h3 className="text-bad font-bold">{fa.account.deleteTitle}</h3>
      <p className="text-ink-2 mt-1 text-sm">{fa.account.deleteBody}</p>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" name="confirm" className="accent-bad size-[18px]" />
        {fa.account.deleteConfirm}
      </label>
      {!sent ? (
        <>
          {needCaptcha && <Captcha onChange={setCaptcha} refreshKey={round} />}
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending}
            className="rounded-ctl border-bad text-bad mt-3 min-h-11 border-[1.5px] px-4 text-sm font-bold disabled:opacity-50"
          >
            {fa.account.deleteSendCode}
          </button>
        </>
      ) : (
        <>
          <p className="text-ink-2 mt-3 text-sm">{fa.account.deleteCodeSent(formatMobile(sent))}</p>
          <label htmlFor="del-code" className="mt-2 block text-sm font-medium">
            {fa.account.deleteCodeLabel}
          </label>
          <input
            id="del-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            dir="ltr"
            maxLength={9}
            className="rounded-ctl border-line bg-surface min-h-11 w-40 border-[1.5px] px-3 text-center tracking-[0.4em]"
          />
          <div>
            <button
              type="submit"
              disabled={pending}
              className="rounded-ctl border-bad bg-bad mt-3 min-h-11 border-[1.5px] px-4 text-sm font-bold text-white disabled:opacity-50"
            >
              {fa.account.deleteCta}
            </button>
          </div>
        </>
      )}
      {(note || state.message) && (
        <p role="alert" className={`mt-2 text-sm ${state.ok ? "text-ok" : "text-bad"}`}>
          {state.message ?? note}
        </p>
      )}
    </form>
  );
}
