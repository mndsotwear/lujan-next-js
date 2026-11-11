"use client";
/** سؤال امنیتی (D-059): فقط وقتی سرور بخواهد نشان داده می‌شود */
import { useEffect, useState } from "react";
import { fa } from "@/content/fa";

export type CaptchaValue = { token: string; answer: string };

export function Captcha({
  onChange,
  refreshKey,
}: {
  onChange: (v: CaptchaValue | null) => void;
  /** با هر تغییر، تصویر تازه گرفته می‌شود (مثلاً پس از پاسخ غلط) */
  refreshKey: number;
}) {
  const t = fa.account.captcha;
  const [img, setImg] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState(false);

  const [round, setRound] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch("/api/captcha", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ token: string; svg: string }>) : null))
      .catch(() => null)
      .then((c) => {
        if (!alive) return;
        setAnswer("");
        if (!c) return setError(true);
        setError(false);
        setToken(c.token);
        setImg(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(c.svg)}`);
      });
    return () => {
      alive = false;
    };
  }, [refreshKey, round]);

  return (
    <fieldset className="rounded-ctl border-line bg-surface-2/40 mt-4 space-y-2 border p-3">
      <legend className="px-1 text-sm font-bold">{t.title}</legend>
      <p className="text-ink-2 text-xs leading-6">{t.body}</p>
      <div className="flex items-center gap-2">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element -- تصویر SVG ساخته‌شده روی سرور
          <img src={img} alt={t.alt} width={220} height={80} className="rounded-ctl" />
        ) : (
          <span className="bg-surface-2 rounded-ctl block h-[80px] w-[220px]" />
        )}
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setRound((n) => n + 1);
          }}
          className="text-copper text-sm underline"
        >
          {t.refresh}
        </button>
      </div>
      {error && <p className="text-bad text-xs">{t.failed}</p>}
      <label htmlFor="captcha-answer" className="block text-xs font-medium">
        {t.answer}
      </label>
      <input
        id="captcha-answer"
        inputMode="numeric"
        autoComplete="off"
        dir="ltr"
        maxLength={3}
        value={answer}
        onChange={(e) => {
          setAnswer(e.target.value);
          onChange(token ? { token, answer: e.target.value } : null);
        }}
        className="rounded-ctl border-line bg-surface focus:border-copper min-h-11 w-28 border-[1.5px] px-3 text-center text-lg focus:outline-none"
      />
    </fieldset>
  );
}
