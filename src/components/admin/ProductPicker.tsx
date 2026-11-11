"use client";
/** انتخاب چند محصول به ترتیب (مقاله و صفحه‌ی فرود) — هر انتخاب یک input پنهان productIds */
import { useMemo, useState } from "react";
import { fa } from "@/content/fa";
import { btnGhost, inputCls } from "./ui";

export function ProductPicker({
  options,
  initial,
  label,
  max = 12,
  error,
}: {
  options: { id: string; name: string }[];
  initial: string[];
  label: string;
  max?: number;
  error?: string;
}) {
  const t = fa.admin.content.picker;
  const names = useMemo(() => new Map(options.map((o) => [o.id, o.name])), [options]);
  const [ids, setIds] = useState(initial.filter((id) => names.has(id)));
  const [q, setQ] = useState("");
  const matches = q.trim()
    ? options.filter((o) => !ids.includes(o.id) && o.name.includes(q.trim())).slice(0, 8)
    : [];

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-xs font-medium">{label}</legend>
      {ids.map((id) => (
        <input key={id} type="hidden" name="productIds" value={id} />
      ))}
      {ids.length === 0 ? (
        <p className="text-steel text-sm">{t.none}</p>
      ) : (
        <ol className="space-y-1">
          {ids.map((id, i) => (
            <li
              key={id}
              className="bg-surface-2/60 rounded-ctl flex items-center gap-2 px-3 py-1.5 text-sm"
            >
              <span className="text-steel w-5">{(i + 1).toLocaleString("fa-IR")}</span>
              <span className="flex-1">{names.get(id)}</span>
              <button
                type="button"
                disabled={i === 0}
                onClick={() =>
                  setIds((xs) => [...xs.slice(0, i - 1), xs[i]!, xs[i - 1]!, ...xs.slice(i + 1)])
                }
                className={btnGhost}
              >
                {t.up}
              </button>
              <button
                type="button"
                onClick={() => setIds((xs) => xs.filter((x) => x !== id))}
                className={btnGhost}
              >
                {t.remove}
              </button>
            </li>
          ))}
        </ol>
      )}
      {ids.length < max && (
        <div className="relative">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.search}
            aria-label={t.search}
            className={inputCls}
          />
          {matches.length > 0 && (
            <ul className="border-line bg-surface rounded-ctl absolute inset-x-0 top-full z-10 mt-1 border shadow-sm">
              {matches.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setIds((xs) => [...xs, o.id]);
                      setQ("");
                    }}
                    className="hover:bg-surface-2 w-full px-3 py-2 text-start text-sm"
                  >
                    {o.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <small className="text-steel text-xs">{t.selected(ids.length)}</small>
      {error && <p className="text-bad text-sm">{error}</p>}
    </fieldset>
  );
}
