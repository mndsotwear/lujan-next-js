import type { Metadata } from "next";
import { BackupButton } from "@/components/admin/BackupButton";
import { DownloadLink } from "@/components/admin/DownloadLink";
import { fa } from "@/content/fa";
import { listBackups, requireStaff } from "@/modules/admin/server";

export const metadata: Metadata = { title: fa.admin.backup.title };
export const dynamic = "force-dynamic";

const date = (d: Date | string) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(d),
  );
const size = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.ceil(b / 1e3)} KB`);

/** پشتیبان‌گیری (FR-ADM-14، D-051) — فقط مدیر کل */
export default async function BackupPage() {
  await requireStaff("backup.manage");
  const { status, files } = await listBackups();
  const t = fa.admin.backup;
  const box = "rounded-card border-line bg-surface border p-5";
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <section className={`${box} space-y-3`}>
        <p className="text-ink-2 text-sm leading-7">{t.intro}</p>
        {status ? (
          <p className={status.ok ? "text-ok" : "text-bad"}>
            {status.ok ? t.lastOk(date(status.at)) : t.lastFailed(date(status.at))}
            {!status.ok && status.error && (
              <code dir="ltr" className="text-ink-2 mt-1 block text-xs break-all">
                {status.error}
              </code>
            )}
          </p>
        ) : (
          <p className="text-copper">{t.never}</p>
        )}
        <BackupButton />
      </section>
      <section className={box}>
        <h2 className="mb-3 font-bold">{t.files}</h2>
        {files.length ? (
          <ul className="divide-line divide-y text-sm">
            {files.map((f) => (
              <li key={f.name} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                <span dir="ltr" className="font-mono">
                  {f.name}
                </span>
                <span className="text-ink-2">
                  {f.name.startsWith("db-") ? t.kindDb : t.kindFiles}
                </span>
                <span className="text-ink-2">{size(f.size)}</span>
                <span className="text-ink-2">{date(f.at)}</span>
                <span className="ms-auto">
                  <DownloadLink href={`/admin/backup/download/${f.name}`}>
                    {t.download}
                  </DownloadLink>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-2 text-sm">{t.none}</p>
        )}
      </section>
      <section className={`${box} text-ink-2 space-y-2 text-sm leading-7`}>
        <h2 className="text-ink font-bold">{t.restoreTitle}</h2>
        <p>{t.restoreBody}</p>
        <code dir="ltr" className="bg-surface-2 rounded-ctl block p-2 text-xs">
          npm run backup:restore -- db-YYYY-MM-DD_HHMM.dump
        </code>
        <p>{t.offsite}</p>
      </section>
    </div>
  );
}
