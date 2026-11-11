import Link from "next/link";
import { fa } from "@/content/fa";
import { breadcrumbLd } from "@/modules/seo";
import { JsonLd } from "./JsonLd";

/** با path (نشانی همین صفحه)، مسیر برای گوگل هم به‌صورت BreadcrumbList فرستاده می‌شود */
export function Breadcrumbs({
  items,
  path,
}: {
  items: { label: string; href?: string }[];
  path?: string;
}) {
  return (
    <nav aria-label={fa.nav.breadcrumb} className="text-steel py-4 text-xs">
      <ol className="flex flex-wrap gap-2">
        {items.map((it, i) => (
          <li key={`${it.label}-${i}`} className="flex gap-2">
            {i > 0 && <span aria-hidden>/</span>}
            {it.href ? (
              <Link href={it.href} className="hover:text-ink">
                {it.label}
              </Link>
            ) : (
              <span aria-current="page">{it.label}</span>
            )}
          </li>
        ))}
      </ol>
      {path && <JsonLd data={breadcrumbLd(items, path)} />}
    </nav>
  );
}
