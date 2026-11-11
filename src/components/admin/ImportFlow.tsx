"use client";
/** ورود اکسل با پیش‌نمایش (FR-ADM-02، D-049) */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { fa } from "@/content/fa";
import type { PlanRow } from "@/modules/catalog";
import { applyImport, previewImport, type ImportPreview } from "@/modules/catalog/import-actions";
import { btnPrimary, card } from "./ui";

const t = fa.admin.importer;
const show = (v: unknown) =>
  v === null || v === undefined || v === ""
    ? "—"
    : typeof v === "boolean"
      ? v
        ? "بله"
        : "خیر"
      : typeof v === "number"
        ? v.toLocaleString("fa-IR")
        : String(v);

export function ImportFlow() {
  const router = useRouter();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, start] = useTransition();
  const [over, setOver] = useState(false);

  const onFile = (file: File) =>
    start(async () => {
      setMsg(null);
      const f = new FormData();
      f.set("file", file);
      setPreview(
        await previewImport(f).catch(() => ({
          ok: false as const,
          message: fa.cart.errors.network,
        })),
      );
    });

  const todo = preview?.ok
    ? preview.summary.update +
      preview.summary.createVariant +
      preview.rows.filter((r) => r.action === "create-product").length
    : 0;

  return (
    <div className="space-y-4">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        className={`rounded-card flex cursor-pointer flex-col items-center gap-2 border-2 border-dashed p-8 text-center ${over ? "border-copper bg-copper/10" : "border-line bg-surface"}`}
      >
        <b className="text-lg">{busy && !preview ? t.reading : t.dropTitle}</b>
        <span className="text-ink-2 text-sm">{t.dropHint}</span>
        <span className={`${btnPrimary} inline-grid place-items-center`}>{t.choose}</span>
        <input
          type="file"
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </label>
      {preview && !preview.ok && <p className="text-bad text-sm">{preview.message}</p>}
      {preview?.ok && (
        <div className="space-y-4">
          <div className={`${card} flex flex-wrap gap-x-6 gap-y-2 p-4 text-sm`}>
            {(Object.keys(t.summary) as (keyof typeof t.summary)[]).map((k) => (
              <span
                key={k}
                className={k === "error" && preview.summary.error ? "text-bad font-bold" : ""}
              >
                {t.summary[k]}: <b>{preview.summary[k].toLocaleString("fa-IR")}</b>
              </span>
            ))}
          </div>
          {preview.summary.error > 0 && <p className="text-ink-2 text-sm">{t.errorsOnlyHint}</p>}
          <div className={`${card} max-h-[60vh] overflow-auto`}>
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-surface sticky top-0">
                <tr className="border-line text-steel border-b">
                  {Object.values(t.col).map((c) => (
                    <th key={c} className="p-2 text-start font-medium">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r: PlanRow) => (
                  <tr
                    key={r.line}
                    className={`border-line border-b align-top ${r.action === "error" ? "bg-bad/5" : r.action === "unchanged" ? "opacity-60" : ""}`}
                  >
                    <td className="p-2">{r.line.toLocaleString("fa-IR")}</td>
                    <td dir="ltr" className="p-2 text-end font-mono">
                      {r.sku || "—"}
                    </td>
                    <td
                      className={`p-2 whitespace-nowrap ${r.action === "error" ? "text-bad" : r.action.startsWith("create") ? "text-copper" : ""}`}
                    >
                      {t.actions[r.action]}
                    </td>
                    <td className="p-2">
                      {r.errors.map((e) => (
                        <p key={e} className="text-bad">
                          {e}
                        </p>
                      ))}
                      {r.warnings.map((w) => (
                        <p key={w} className="text-copper text-xs">
                          {w}
                        </p>
                      ))}
                      {r.action === "update" &&
                        r.changes.map((c) => (
                          <p key={c.field}>
                            {t.fields[c.field]}:{" "}
                            <span className="text-steel line-through">{show(c.from)}</span> ←{" "}
                            <b>{show(c.to)}</b>
                          </p>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy || todo === 0}
              onClick={() => {
                if (!window.confirm(t.confirm(todo))) return;
                start(async () => {
                  const r = await applyImport(preview.token).catch(() => ({
                    ok: false,
                    message: fa.cart.errors.network,
                  }));
                  setMsg(r);
                  if (r.ok) {
                    setPreview(null);
                    router.refresh();
                  }
                });
              }}
              className={btnPrimary}
            >
              {busy ? t.applying : t.apply}
            </button>
            {todo === 0 && <span className="text-ink-2 text-sm">{t.nothing}</span>}
          </div>
        </div>
      )}
      {msg && (
        <p role="status" className={`text-sm ${msg.ok ? "text-ok" : "text-bad"}`}>
          {msg.message}
        </p>
      )}
    </div>
  );
}
