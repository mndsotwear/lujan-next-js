"use client";
/** گروه‌های مترادف و جستجوهای بی‌نتیجه (FR-SRCH-03, FR-SRCH-05) */
import { useState, useTransition } from "react";
import { fa } from "@/content/fa";
import { deleteSynonyms, saveSynonyms, type SynResult } from "@/modules/search/admin-actions";
import { btnGhost, btnPrimary, card, inputCls } from "./ui";

const t = fa.admin.marketing.synonyms;

function Group({ id, terms, active }: { id: string; terms: string[]; active: boolean }) {
  const [text, setText] = useState(terms.join("، "));
  const [on, setOn] = useState(active);
  const [msg, setMsg] = useState<SynResult | null>(null);
  const [busy, start] = useTransition();
  return (
    <li className={`${card} flex flex-wrap items-center gap-2 p-3`}>
      <label className="sr-only" htmlFor={`syn-${id}`}>
        {t.placeholder}
      </label>
      <input
        id={`syn-${id}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className={`${inputCls} min-h-10 flex-1 text-sm`}
      />
      <label className="flex items-center gap-1 text-sm">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => setOn(e.target.checked)}
          className="accent-copper size-4"
        />
        {t.active}
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={() => start(async () => setMsg(await saveSynonyms(id, text, on)))}
        className={btnGhost}
      >
        {t.save}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => start(async () => setMsg(await deleteSynonyms(id)))}
        className={`${btnGhost} text-bad`}
      >
        {t.remove}
      </button>
      {msg && <small className={msg.ok ? "text-ok" : "text-bad"}>{msg.message}</small>}
    </li>
  );
}

export function SynonymManager({
  builtIn,
  groups,
  zero,
}: {
  builtIn: string[][];
  groups: { id: string; terms: string[]; isActive: boolean }[];
  zero: { query: string; count: number }[];
}) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<SynResult | null>(null);
  const [busy, start] = useTransition();
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <p className="text-ink-2 text-sm">{t.intro}</p>
        <div className={`${card} flex flex-wrap gap-2 p-3`}>
          <label className="sr-only" htmlFor="syn-new">
            {t.placeholder}
          </label>
          <input
            id="syn-new"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.placeholder}
            className={`${inputCls} min-h-10 flex-1 text-sm`}
          />
          <button
            type="button"
            disabled={busy || !text.trim()}
            onClick={() =>
              start(async () => {
                const r = await saveSynonyms(null, text);
                setMsg(r);
                if (r.ok) setText("");
              })
            }
            className={btnPrimary}
          >
            {t.add}
          </button>
          {msg && (
            <small className={`w-full ${msg.ok ? "text-ok" : "text-bad"}`}>{msg.message}</small>
          )}
        </div>
        <h3 className="font-bold">{t.custom}</h3>
        <ul className="space-y-2">
          {groups.map((g) => (
            <Group key={g.id} id={g.id} terms={g.terms} active={g.isActive} />
          ))}
        </ul>
        <details>
          <summary className="text-ink-2 cursor-pointer text-sm">{t.builtIn}</summary>
          <ul className="text-ink-2 mt-2 space-y-1 text-sm">
            {builtIn.map((g) => (
              <li key={g.join("|")}>{g.join("، ")}</li>
            ))}
          </ul>
        </details>
      </div>
      <aside className={`${card} h-fit p-4`}>
        <h3 className="mb-1 font-bold">{t.zeroTitle}</h3>
        <p className="text-steel mb-3 text-xs leading-6">{t.zeroHint}</p>
        {zero.length ? (
          <ul className="space-y-2 text-sm">
            {zero.map((z) => (
              <li key={z.query} className="flex items-center justify-between gap-2">
                <span>
                  {z.query} <small className="text-steel">{t.times(z.count)}</small>
                </span>
                <button
                  type="button"
                  onClick={() => setText(text ? `${text}، ${z.query}` : z.query)}
                  className="text-copper text-xs underline"
                >
                  {t.useIt}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-2 text-sm">{t.noZero}</p>
        )}
      </aside>
    </div>
  );
}
