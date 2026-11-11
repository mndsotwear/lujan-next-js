import type { Metadata } from "next";
import { Pager } from "@/components/admin/Pager";
import { pageOf, paginate } from "@/lib/paginate";
import Link from "next/link";
import { CatalogTabs } from "@/components/admin/CatalogTabs";
import { fa } from "@/content/fa";
import { formatNumber } from "@/lib/format";
import { requireStaff } from "@/modules/admin/server";
import {
  listCategoriesAdmin,
  listProductsAdmin,
  type ProductFilters,
} from "@/modules/catalog/server";

export const metadata: Metadata = { title: fa.admin.catalog.products };

/** فهرست محصولات (FR-ADM-01) */
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireStaff("products.manage");
  const sp = await searchParams;
  const f: ProductFilters = {
    q: sp.q?.trim().slice(0, 60) || undefined,
    category: /^[a-z0-9-]{1,80}$/.test(sp.category ?? "") ? sp.category : undefined,
    status: ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(sp.status ?? "")
      ? (sp.status as ProductFilters["status"])
      : undefined,
    stock: sp.stock === "out" || sp.stock === "low" ? sp.stock : undefined,
  };
  const [rows, categories] = await Promise.all([listProductsAdmin(f), listCategoriesAdmin()]);
  const pg = paginate(rows, pageOf(sp.page));
  const t = fa.admin.catalog;
  const sel = "rounded-ctl border-line bg-surface min-h-10 border-[1.5px] px-2 text-sm";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t.products}</h1>
        <Link
          href="/admin/products/new"
          className="rounded-ctl bg-ink text-bg min-h-10 px-4 py-2 text-sm font-bold"
        >
          {t.newProduct}
        </Link>
      </div>
      <CatalogTabs active="products" />
      <form className="rounded-card border-line bg-surface grid gap-3 border p-4 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <input
          name="q"
          defaultValue={f.q}
          placeholder={t.search}
          aria-label={t.search}
          className={sel}
        />
        <select
          name="category"
          defaultValue={f.category ?? ""}
          aria-label={t.allCategories}
          className={sel}
        >
          <option value="">{t.allCategories}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={f.status ?? ""}
          aria-label={t.allStatuses}
          className={sel}
        >
          <option value="">{t.allStatuses}</option>
          {Object.entries(t.status).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select name="stock" defaultValue={f.stock ?? ""} aria-label={t.anyStock} className={sel}>
          <option value="">{t.anyStock}</option>
          <option value="low">{t.lowStock}</option>
          <option value="out">{t.outOfStock}</option>
        </select>
        <button
          type="submit"
          className="rounded-ctl bg-ink text-bg min-h-10 px-4 text-sm font-bold"
        >
          {t.filter}
        </button>
      </form>
      <Pager page={pg.page} pages={pg.pages} total={pg.total} params={sp} />
      <p className="text-ink-2 text-sm">{t.count(rows.length)}</p>
      <div className="rounded-card border-line bg-surface overflow-x-auto border">
        {rows.length ? (
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-line text-steel border-b">
                {Object.values(t.col).map((c) => (
                  <th key={c} className="p-3 text-start font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pg.items.map((p) => (
                <tr key={p.id} className="border-line hover:bg-surface-2/50 border-b last:border-0">
                  <td className="p-3">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="font-bold underline-offset-4 hover:underline"
                    >
                      {p.name}
                    </Link>
                    <span dir="ltr" className="text-steel block text-xs">
                      {p.slug}
                    </span>
                  </td>
                  <td className="text-ink-2 p-3">
                    {p.category.name}
                    <span className="block">{p.brand.name}</span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {p.minPrice ? (
                      formatNumber(p.minPrice)
                    ) : (
                      <span className="text-bad">{t.noPrice}</span>
                    )}
                  </td>
                  <td
                    className={`p-3 ${p.stock === 0 ? "text-bad" : p.low ? "text-copper font-bold" : ""}`}
                  >
                    {formatNumber(p.stock)}
                  </td>
                  <td className="p-3">
                    <span className={p.status === "PUBLISHED" ? "text-ok" : "text-ink-2"}>
                      {t.status[p.status]}
                    </span>
                  </td>
                  <td className="text-ink-2 p-3">{formatNumber(p._count.images)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-ink-2 p-6 text-sm">{t.empty}</p>
        )}
      </div>
    </div>
  );
}
