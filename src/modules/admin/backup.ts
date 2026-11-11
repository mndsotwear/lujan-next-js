/**
 * پشتیبان‌گیری (FR-ADM-14، NFR-SEC-08، D-051) — فقط سرور.
 * پایگاه داده با pg_dump (قالب سفارشی، قابل بازگردانی با pg_restore) + بایگانی tar پوشه‌ی storage (تصویرها).
 * نگهداری BACKUP_KEEP_DAYS روز (پیش‌فرض ۳۰). بازگردانی فقط روی سرور: npm run backup:restore
 */
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
export const backupDir = () => process.env.BACKUP_DIR ?? path.join(process.cwd(), "backups");
const storageDir = () => process.env.UPLOAD_DIR ?? path.join(process.cwd(), "storage");
const keepDays = () => Number(process.env.BACKUP_KEEP_DAYS ?? 30) || 30;
export const BACKUP_NAME = /^(db|files)-\d{4}-\d{2}-\d{2}_\d{4}\.(dump|tgz)$/;

/** pg_dump/pg_restore: متغیر PG_BIN_DIR، یا DBngin روی مک، یا مسیرهای رایج، یا PATH */
export async function pgTool(name: "pg_dump" | "pg_restore"): Promise<string> {
  if (process.env.PG_BIN_DIR) return path.join(process.env.PG_BIN_DIR, name);
  const dbngin = "/Users/Shared/DBngin/postgresql";
  if (existsSync(/*turbopackIgnore: true*/ dbngin)) {
    const versions = (await readdir(/*turbopackIgnore: true*/ dbngin)).sort((a, b) =>
      b.localeCompare(a, "en", { numeric: true }),
    );
    for (const v of versions) {
      const p = path.join(dbngin, v, "bin", name);
      if (existsSync(/*turbopackIgnore: true*/ p)) return p;
    }
  }
  for (const dir of ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin"])
    if (existsSync(/*turbopackIgnore: true*/ path.join(dir, name))) return path.join(dir, name);
  return name;
}

/** pg_dump پارامترهای Prisma مثل ?schema= را نمی‌شناسد */
export const dbUrl = () => (process.env.DATABASE_URL ?? "").split("?")[0]!;

const stamp = (d = new Date()) => {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}_${g("hour")}${g("minute")}`;
};

export type BackupStatus = { at: string; ok: boolean; error?: string; files: string[] };

export async function runBackup(): Promise<BackupStatus> {
  const dir = backupDir();
  await mkdir(/*turbopackIgnore: true*/ dir, { recursive: true });
  const s = stamp();
  const files: string[] = [];
  let status: BackupStatus;
  try {
    const dbFile = `db-${s}.dump`;
    await run(
      await pgTool("pg_dump"),
      ["-Fc", "--no-owner", "--no-acl", "-d", dbUrl(), "-f", path.join(dir, dbFile)],
      {
        timeout: 10 * 60_000,
      },
    );
    files.push(dbFile);
    if (existsSync(/*turbopackIgnore: true*/ storageDir())) {
      const tgz = `files-${s}.tgz`;
      await run("tar", ["-czf", path.join(dir, tgz), "-C", storageDir(), "."], {
        timeout: 10 * 60_000,
      });
      files.push(tgz);
    }
    await prune();
    status = { at: new Date().toISOString(), ok: true, files };
  } catch (e) {
    status = {
      at: new Date().toISOString(),
      ok: false,
      files,
      error: (e instanceof Error ? e.message : String(e)).slice(0, 400),
    };
  }
  await writeFile(
    /*turbopackIgnore: true*/ path.join(dir, "status.json"),
    JSON.stringify(status, null, 2),
  );
  return status;
}

async function prune() {
  const dir = backupDir();
  const limit = Date.now() - keepDays() * 86_400_000;
  for (const f of await readdir(/*turbopackIgnore: true*/ dir)) {
    if (!BACKUP_NAME.test(f)) continue;
    const st = await stat(/*turbopackIgnore: true*/ path.join(dir, f));
    if (st.mtimeMs < limit) await unlink(/*turbopackIgnore: true*/ path.join(dir, f));
  }
}

export async function listBackups() {
  const dir = backupDir();
  if (!existsSync(/*turbopackIgnore: true*/ dir)) return { status: null, files: [] };
  const names = (await readdir(/*turbopackIgnore: true*/ dir)).filter((f) => BACKUP_NAME.test(f));
  const files = await Promise.all(
    names.map(async (name) => {
      const st = await stat(/*turbopackIgnore: true*/ path.join(dir, name));
      return { name, size: st.size, at: st.mtime };
    }),
  );
  const status = await readFile(/*turbopackIgnore: true*/ path.join(dir, "status.json"), "utf8")
    .then((s) => JSON.parse(s) as BackupStatus)
    .catch(() => null);
  return { status, files: files.sort((a, b) => b.at.getTime() - a.at.getTime()) };
}
