"use client";
/** قوانین پیشنهاد سبد (FR-REC-09) */
import { useState, useTransition } from "react";
import { fa } from "@/content/fa";
import {
  deleteRule,
  saveRule,
  setRuleActive,
  type RuleResult,
} from "@/modules/recommendations/actions";
import { btnGhost, btnPrimary, card, inputCls } from "./ui";

type Rule = {
  id: string;
  source: { id: string; name: string };
  target: { id: string; name: string };
  type: string;
  reasonLabel: string | null;
  priority: number;
  isActive: boolean;
};
const t = fa.admin.marketing.rules;

export function RuleManager({
  rules,
  products,
}: {
  rules: Rule[];
  products: { id: string; name: string }[];
}) {
  const [src, setSrc] = useState("");
  const [dst, setDst] = useState("");
  const [type, setType] = useState("COMPLEMENT");
  const [reason, setReason] = useState("");
  const [priority, setPriority] = useState("0");
  const [msg, setMsg] = useState<RuleResult | null>(null);
  const [busy, start] = useTransition();
  const run = (fn: () => Promise<RuleResult>) =>
    start(async () =>
      setMsg(await fn().catch(() => ({ ok: false, message: fa.cart.errors.network }))),
    );
  const select = (id: string, label: string, value: string, set: (v: string) => void) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => set(e.target.value)}
        className={`${inputCls} min-h-10 text-sm`}
      >
        <option value="">{t.pick}</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
  return (
    <div className="space-y-4">
      <p className="text-ink-2 text-sm">{t.intro}</p>
      <div className={`${card} space-y-3 p-4`}>
        <div className="grid gap-3 md:grid-cols-2">
          {select("r-src", t.source, src, setSrc)}
          {select("r-dst", t.target, dst, setDst)}
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_2fr_1fr]">
          <div className="flex flex-col gap-1">
            <label htmlFor="r-type" className="text-xs font-medium">
              {t.type}
            </label>
            <select
              id="r-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={`${inputCls} min-h-10 text-sm`}
            >
              {Object.entries(t.types).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="r-reason" className="text-xs font-medium">
              {t.reason}
            </label>
            <input
              id="r-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={`${inputCls} min-h-10 text-sm`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="r-priority" className="text-xs font-medium">
              {t.priority}
            </label>
            <input
              id="r-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              inputMode="numeric"
              className={`${inputCls} min-h-10 text-sm`}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={busy || !src || !dst}
            onClick={() =>
              run(() =>
                saveRule({
                  sourceProductId: src,
                  targetProductId: dst,
                  type,
                  reasonLabel: reason,
                  priority: Number(priority) || 0,
                }),
              )
            }
            className={btnPrimary}
          >
            {t.add}
          </button>
          <span role="status" className={`text-sm ${msg?.ok ? "text-ok" : "text-bad"}`}>
            {msg?.message ?? ""}
          </span>
        </div>
      </div>
      {rules.length ? (
        <ul className="space-y-2">
          {rules.map((r) => (
            <li
              key={r.id}
              className={`${card} flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm ${r.isActive ? "" : "opacity-60"}`}
            >
              <b>{r.source.name}</b>
              <span className="text-steel">←</span>
              <span>{r.target.name}</span>
              <span
                className={`rounded-chip px-2 text-xs ${r.type === "EXCLUDE" ? "bg-surface-2 text-bad" : "bg-surface-2"}`}
              >
                {t.types[r.type]}
              </span>
              {r.reasonLabel && <span className="text-ink-2">«{r.reasonLabel}»</span>}
              <span className="text-steel text-xs">{r.priority.toLocaleString("fa-IR")}</span>
              <span className="ms-auto flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => setRuleActive(r.id, !r.isActive))}
                  className={btnGhost}
                >
                  {r.isActive ? t.on : t.off}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => deleteRule(r.id))}
                  className={`${btnGhost} text-bad`}
                >
                  {t.remove}
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-2 text-sm">{t.empty}</p>
      )}
    </div>
  );
}
