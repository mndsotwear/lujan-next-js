import type { Metadata } from "next";
import { CatalogTabs } from "@/components/admin/CatalogTabs";
import { DownloadLink } from "@/components/admin/DownloadLink";
import { ImportFlow } from "@/components/admin/ImportFlow";
import { fa } from "@/content/fa";
import { requireStaff } from "@/modules/admin/server";

export const metadata: Metadata = { title: fa.admin.importer.title };

/** ورود و خروجی اکسل محصولات (FR-ADM-02، D-049) */
export default async function ImportPage() {
  await requireStaff("products.manage");
  const t = fa.admin.importer;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <CatalogTabs active="import" />
      <p className="text-ink-2 text-sm">{t.intro}</p>
      <ul className="text-ink-2 list-disc space-y-1 ps-6 text-sm">
        {t.rules.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <h2 className="font-bold">{t.step1}</h2>
      <div className="flex flex-wrap gap-2">
        <DownloadLink href="/admin/products/export?format=xlsx">{t.exportXlsx}</DownloadLink>
        <DownloadLink href="/admin/products/export?format=csv">{t.exportCsv}</DownloadLink>
        <DownloadLink href="/admin/products/export?format=xlsx&template=1">
          {t.template}
        </DownloadLink>
      </div>
      <h2 className="font-bold">{t.step2}</h2>
      <p className="text-ink-2 text-sm">{t.step2Body}</p>
      <h2 className="font-bold">{t.step3}</h2>
      <ImportFlow />
    </div>
  );
}
