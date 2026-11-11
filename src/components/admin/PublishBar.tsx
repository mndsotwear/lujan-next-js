"use client";
/** وضعیت انتشار محصول در بالای صفحه، با دکمه‌ی انتشار (FR-ADM-01) */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { fa } from "@/content/fa";
import { setProductStatus } from "@/modules/catalog/admin-actions";
import { btnGhost, btnPrimary } from "./ui";

export function PublishBar({
  productId,
  status,
  hasPricedVariant,
}: {
  productId: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  hasPricedVariant: boolean;
}) {
  const t = fa.admin.catalog.publishBar;
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, start] = useTransition();
  const go = (to: "PUBLISHED" | "DRAFT") =>
    start(async () => {
      const r = await setProductStatus(productId, to);
      setMsg(r);
      if (r.ok) router.refresh();
    });
  const live = status === "PUBLISHED";
  return (
    <div
      className={`rounded-card flex flex-wrap items-center gap-3 border p-4 ${live ? "border-ok bg-ok/10" : "border-copper bg-copper/10"}`}
    >
      <b className={live ? "text-ok" : "text-copper"}>{t[status]}</b>
      {!live && !hasPricedVariant && <span className="text-ink-2 text-sm">{t.missingVariant}</span>}
      <span className="ms-auto flex items-center gap-3">
        <span role="status" className={`text-sm ${msg?.ok ? "text-ok" : "text-bad"}`}>
          {msg?.message ?? ""}
        </span>
        {live ? (
          <button type="button" disabled={busy} onClick={() => go("DRAFT")} className={btnGhost}>
            {t.unpublish}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => go("PUBLISHED")}
            className={btnPrimary}
          >
            {t.publish}
          </button>
        )}
      </span>
    </div>
  );
}
