import Link from "next/link";
import { fa } from "@/content/fa";

/** زبانه‌های بخش محصولات: محصول، دسته، برند */
export function CatalogTabs({
  active,
}: {
  active: "products" | "categories" | "brands" | "import";
}) {
  const t = fa.admin.catalog;
  const tabs = [
    ["products", "/admin/products", t.products],
    ["categories", "/admin/products/categories", t.categories],
    ["brands", "/admin/products/brands", t.brands],
    ["import", "/admin/products/import", t.importExport],
  ] as const;
  return (
    <nav className="border-line flex gap-1 border-b">
      {tabs.map(([k, href, label]) => (
        <Link
          key={k}
          href={href}
          aria-current={active === k ? "page" : undefined}
          className={`-mb-px border-b-2 px-4 py-2 text-sm ${active === k ? "border-copper font-bold" : "text-ink-2 border-transparent"}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
