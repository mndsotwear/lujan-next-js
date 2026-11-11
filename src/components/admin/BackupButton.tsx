"use client";
import { useState, useTransition } from "react";
import { fa } from "@/content/fa";
import { backupNow } from "@/modules/admin/backup-actions";
import { btnPrimary } from "./ui";

export function BackupButton() {
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          start(async () =>
            setMsg(await backupNow().catch(() => ({ ok: false, message: fa.cart.errors.network }))),
          )
        }
        className={btnPrimary}
      >
        {busy ? fa.admin.backup.running : fa.admin.backup.now}
      </button>
      <span role="status" className={`text-sm ${msg?.ok ? "text-ok" : "text-bad"}`}>
        {msg?.message ?? ""}
      </span>
    </div>
  );
}
