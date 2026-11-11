/**
 * بازگردانی از پشتیبان — فقط روی سرور (D-051). همه‌ی داده‌ی فعلی پایگاه داده جایگزین می‌شود.
 *   npm run backup:restore                  ← فهرست پشتیبان‌ها
 *   npm run backup:restore -- db-....dump   ← بازگردانی پایگاه داده (با تأیید)
 *   npm run backup:restore -- files-....tgz ← بازگردانی تصویرها در storage
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { promisify } from "node:util";
import { BACKUP_NAME, backupDir, dbUrl, listBackups, pgTool } from "../src/modules/admin/backup";

const run = promisify(execFile);

async function main() {
  const name = process.argv[2];
  if (!name) {
    const { files } = await listBackups();
    console.log(
      files.length
        ? files.map((f) => `${f.name}  ${(f.size / 1e6).toFixed(1)}MB`).join("\n")
        : "پشتیبانی نیست.",
    );
    return;
  }
  if (!BACKUP_NAME.test(name)) throw new Error("نام فایل نامعتبر است.");
  const file = path.join(backupDir(), name);
  const dbName = new URL(dbUrl()).pathname.slice(1);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    name.startsWith("db-")
      ? `⚠ همه‌ی داده‌ی پایگاه «${dbName}» با ${name} جایگزین می‌شود. برای ادامه نام پایگاه را بنویسید: `
      : `⚠ پوشه‌ی storage با ${name} بازنویسی می‌شود. برای ادامه بنویسید RESTORE: `,
  );
  rl.close();
  if (answer.trim() !== (name.startsWith("db-") ? dbName : "RESTORE")) {
    console.log("لغو شد.");
    return;
  }
  if (name.startsWith("db-")) {
    await run(
      await pgTool("pg_restore"),
      ["--clean", "--if-exists", "--no-owner", "--no-acl", "-d", dbUrl(), file],
      {
        timeout: 30 * 60_000,
      },
    );
  } else {
    const storage = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "storage");
    await mkdir(storage, { recursive: true });
    await run("tar", ["-xzf", file, "-C", storage], { timeout: 30 * 60_000 });
  }
  console.log(`✓ بازگردانی ${name} انجام شد.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
