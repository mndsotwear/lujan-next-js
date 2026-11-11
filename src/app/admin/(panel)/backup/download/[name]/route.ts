/** دانلود فایل پشتیبان — فقط مدیر کل، با ثبت در تاریخچه (D-051) */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { audit, BACKUP_NAME, backupDir, staffWith } from "@/modules/admin/server";

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const me = await staffWith("backup.manage");
  const { name } = await params;
  if (!me || !BACKUP_NAME.test(name)) return new Response("Not found", { status: 404 });
  const file = await readFile(path.join(backupDir(), name)).catch(() => null);
  if (!file) return new Response("Not found", { status: 404 });
  await audit(me.id, "backup.download", "backup", name);
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
