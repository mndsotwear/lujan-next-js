"use client";
/** متن با قالب پایه (D-044): دکمه‌های پررنگ/فهرست/تیتر و پیش‌نمایش — برای مقاله و صفحه‌ی فرود */
import { useRef, useState } from "react";
import { fa } from "@/content/fa";
import { RichText } from "../RichText";
import { btnGhost, inputCls } from "./ui";

export function RichTextField({
  id,
  name,
  label,
  hint,
  defaultValue,
  rows = 14,
  error,
}: {
  id: string;
  name: string;
  label: string;
  hint?: string;
  defaultValue: string;
  rows?: number;
  error?: string;
}) {
  const t = fa.admin.catalog;
  const [text, setText] = useState(defaultValue);
  const [preview, setPreview] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);

  const wrap = (kind: "bold" | "list" | "heading") => {
    const el = area.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b, value } = el;
    const sel = value.slice(a, b) || (kind === "bold" ? "متن" : "");
    const lineStart = value.lastIndexOf("\n", a - 1) + 1;
    setText(
      kind === "bold"
        ? value.slice(0, a) + `**${sel}**` + value.slice(b)
        : value.slice(0, lineStart) + (kind === "list" ? "- " : "## ") + value.slice(lineStart),
    );
    requestAnimationFrame(() => el.focus());
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium">
          {label}
        </label>
        <div className="flex gap-2">
          {(["bold", "list", "heading"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => wrap(k)}
              className={btnGhost}
              disabled={preview}
            >
              {t.format[k]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className={btnGhost}
            aria-pressed={preview}
          >
            {t.preview}
          </button>
        </div>
      </div>
      <textarea
        ref={area}
        id={id}
        name={name}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={rows}
        aria-invalid={!!error}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={`${inputCls} py-2 leading-7 ${preview ? "hidden" : ""}`}
      />
      {preview && <RichText text={text} className="rounded-ctl bg-surface-2/50 p-4" />}
      {hint && (
        <small id={`${id}-hint`} className="text-steel text-xs">
          {hint}
        </small>
      )}
      {error && <p className="text-bad text-sm">{error}</p>}
    </div>
  );
}
