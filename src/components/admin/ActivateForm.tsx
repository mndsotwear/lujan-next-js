"use client";
/** فعال‌سازی کارمند — مرحله‌ی کد پیامکی (D-035) */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fa } from "@/content/fa";
import { startActivation, verifyActivation } from "@/modules/admin/actions";
import { btnPrimary, card, inputCls } from "./ui";

export function ActivateForm({ devMode }: { devMode: boolean }) {
  const t = fa.admin.activate;
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await startActivation(mobile).catch(() => ({
      ok: false,
      message: fa.cart.errors.network,
    }));
    setBusy(false);
    setMsg({ ok: r.ok, text: r.message });
    if (r.ok) setSent(true);
  }

  async function verify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") ?? "");
    setBusy(true);
    const r = await verifyActivation(mobile, code).catch(() => ({
      ok: false,
      message: fa.cart.errors.network,
    }));
    setBusy(false);
    if (r.ok) router.push("/admin/activate/setup");
    else setMsg({ ok: false, text: r.message ?? t.notEligible });
  }

  return (
    <div className={`${card} space-y-4 p-6`}>
      <h1 className="text-xl font-bold">{t.title}</h1>
      <p className="text-ink-2 text-sm leading-7">{t.intro}</p>
      <form onSubmit={(e) => void send(e)} className="space-y-3">
        <label htmlFor="act-mobile" className="text-sm font-medium">
          {fa.admin.login.mobile}
        </label>
        <input
          id="act-mobile"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          inputMode="numeric"
          autoComplete="tel"
          required
          dir="ltr"
          readOnly={sent}
          className={inputCls}
        />
        {!sent && (
          <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
            {t.sendCode}
          </button>
        )}
      </form>
      {sent && (
        <form onSubmit={(e) => void verify(e)} className="space-y-3">
          <label htmlFor="act-code" className="text-sm font-medium">
            {t.smsCode}
          </label>
          <input
            id="act-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            dir="ltr"
            className={`${inputCls} text-center tracking-[0.3em]`}
          />
          {devMode && <small className="text-steel block text-xs">{fa.account.devHint}</small>}
          <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
            {t.verify}
          </button>
        </form>
      )}
      <p role="status" className={`min-h-5 text-sm ${msg?.ok ? "text-ink-2" : "text-bad"}`}>
        {msg?.text ?? ""}
      </p>
    </div>
  );
}
