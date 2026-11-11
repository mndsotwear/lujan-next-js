"use client";
/** دستگاه‌های واردشده و خروج از بقیه (D-022 بند ۳) */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { fa } from "@/content/fa";
import { logoutOtherDevices } from "@/modules/account/actions";

export function SessionList({
  sessions,
}: {
  sessions: { id: string; device: string; since: string; current: boolean }[];
}) {
  const t = fa.account.sessions;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const others = sessions.filter((s) => !s.current).length;
  return (
    <section className="rounded-card border-line bg-surface space-y-3 border p-5">
      <h2 className="font-bold">{t.title}</h2>
      <p className="text-steel text-sm">{t.intro}</p>
      <ul className="divide-line divide-y text-sm">
        {sessions.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span dir="auto">{s.device}</span>
            <span className="text-steel text-xs">
              {s.current ? <b className="text-ok">{t.current}</b> : t.since(s.since)}
            </span>
          </li>
        ))}
      </ul>
      {others > 0 ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm(t.confirm)) return;
            start(async () => {
              const r = await logoutOtherDevices();
              setMsg(r.message);
              router.refresh();
            });
          }}
          className="rounded-ctl border-line min-h-11 border-[1.5px] px-4 text-sm font-bold disabled:opacity-50"
        >
          {t.others}
        </button>
      ) : (
        <p className="text-steel text-xs">{t.none}</p>
      )}
      {msg && (
        <p role="status" className="text-ok text-sm">
          {msg}
        </p>
      )}
    </section>
  );
}
