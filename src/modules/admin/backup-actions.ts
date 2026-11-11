"use server";
/** «پشتیبان الان» از پنل (D-051) — فقط مدیر کل؛ بازگردانی عمداً اینجا نیست */
import { revalidatePath } from "next/cache";
import { fa } from "@/content/fa";
import { hit } from "@/lib/rate-limit";
import { audit } from "./audit";
import { runBackup } from "./backup";
import { staffWith } from "./session";

export async function backupNow(): Promise<{ ok: boolean; message: string }> {
  const t = fa.admin.backup;
  const me = await staffWith("backup.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  if (!hit("backup-now", 1, 5 * 60_000)) return { ok: false, message: t.wait };
  const s = await runBackup();
  await audit(me.id, "backup.run", "backup", null, { ok: s.ok, files: s.files, error: s.error });
  revalidatePath("/admin/backup");
  return s.ok
    ? { ok: true, message: t.done }
    : { ok: false, message: `${t.failed} ${s.error ?? ""}` };
}
