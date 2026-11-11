/** پیمایش صفحه‌های فهرست پنل؛ بقیه‌ی پارامترهای نشانی (فیلترها) حفظ می‌شوند */
import Link from "next/link";
import { fa } from "@/content/fa";

export function Pager({
  page,
  pages,
  total,
  params,
}: {
  page: number;
  pages: number;
  total: number;
  params: Record<string, string | undefined>;
}) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") q.set(k, v);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `?${s}` : "?";
  };
  return (
    <nav
      aria-label={fa.admin.pager.label}
      className="flex items-center justify-center gap-4 py-4 text-sm"
    >
      {page > 1 ? (
        <Link href={href(page - 1)}>{fa.admin.audit.prev}</Link>
      ) : (
        <span className="text-steel">{fa.admin.audit.prev}</span>
      )}
      <span className="text-steel">{fa.admin.pager.status(page, pages, total)}</span>
      {page < pages ? (
        <Link href={href(page + 1)}>{fa.admin.audit.next}</Link>
      ) : (
        <span className="text-steel">{fa.admin.audit.next}</span>
      )}
    </nav>
  );
}
