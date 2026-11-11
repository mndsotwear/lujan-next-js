import type { Metadata } from "next";
import { Pager } from "@/components/admin/Pager";
import { pageOf, paginate } from "@/lib/paginate";
import Link from "next/link";
import { StockControls } from "@/components/admin/StockControls";
import { fa } from "@/content/fa";
import { formatNumber } from "@/lib/format";
import { requireStaff } from "@/modules/admin/server";
import { isLowStock } from "@/modules/inventory";
import { listInventory, stockHistory } from "@/modules/inventory/server";

export const metadata: Metadata = { title: fa.admin.inventory.title };

const date = (d: Date) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium", timeStyle: "short" }).format(
    d,
  );

/** موجودی انبار: فهرست، ورود و خروج، آستانه، تاریخچه (FR-INV-03, FR-INV-04) */
export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; v?: string; page?: string }>;
}) {
  await requireStaff("inventory.manage");
  const sp = await searchParams;
  const tab = sp.tab === "low" || sp.tab === "out" ? sp.tab : "all";
  const q = sp.q?.trim().slice(0, 60) || undefined;
  const rows = await listInventory(tab, q);
  const pg = paginate(rows, pageOf(sp.page));
  const open = rows.find((r) => r.id === sp.v);
  const history = open ? await stockHistory(open.id) : [];
  const t = fa.admin.inventory;
  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ tab, q, page: sp.page, ...patch }))
      if (v && !(k === "tab" && v === "all")) p.set(k, v);
    return `?${p}`;
  };
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <div className="flex flex-wrap items-center gap-3">
        <nav className="flex gap-2 text-sm">
          {(["all", "low", "out"] as const).map((k) => (
            <Link
              key={k}
              href={link({ tab: k, v: undefined })}
              aria-current={tab === k ? "page" : undefined}
              className={`rounded-chip border-line border px-3 py-1 ${tab === k ? "bg-ink text-bg" : ""}`}
            >
              {t.tabs[k]}
            </Link>
          ))}
        </nav>
        <form className="ms-auto flex gap-2">
          {tab !== "all" && <input type="hidden" name="tab" value={tab} />}
          <input
            name="q"
            defaultValue={q}
            placeholder={t.search}
            aria-label={t.search}
            className="rounded-ctl border-line bg-surface min-h-10 border-[1.5px] px-3 text-sm"
          />
          <button
            type="submit"
            className="rounded-ctl bg-ink text-bg min-h-10 px-4 text-sm font-bold"
          >
            {fa.admin.orders.searchBtn}
          </button>
        </form>
      </div>
      <Pager page={pg.page} pages={pg.pages} total={pg.total} params={{ tab, q }} />
      <div className="rounded-card border-line bg-surface overflow-x-auto border">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-line text-steel border-b">
              {Object.values(t.col).map((c, i) => (
                <th key={i} className="p-3 text-start font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pg.items.map((r) => {
              const attrs = Object.values((r.attributes ?? {}) as Record<string, string>).join(
                "، ",
              );
              const low = isLowStock(r.inventory);
              const isOpen = open?.id === r.id;
              return (
                <tr
                  key={r.id}
                  className={`border-line border-b align-top last:border-0 ${isOpen ? "bg-surface-2/40" : ""}`}
                >
                  <td className="p-3">
                    <Link
                      href={`/admin/products/${r.product.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {r.product.name}
                    </Link>
                    <span className="text-steel block text-xs">
                      <span dir="ltr">{r.sku}</span>
                      {attrs ? ` — ${attrs}` : ""}
                      {!r.isActive ? ` — ${fa.admin.catalog.variants.inactive}` : ""}
                    </span>
                    {isOpen && (
                      <div className="mt-4 space-y-4">
                        <StockControls
                          variantId={r.id}
                          threshold={r.inventory.lowStockThreshold}
                          safety={r.inventory.safetyStock}
                        />
                        <div>
                          <h3 className="mb-2 font-bold">{t.history}</h3>
                          {history.length ? (
                            <ul className="space-y-1">
                              {history.map((h) => (
                                <li key={h.id} className="flex flex-wrap gap-x-3">
                                  <b dir="ltr" className={h.delta > 0 ? "text-ok" : "text-bad"}>
                                    {h.delta > 0 ? "+" : ""}
                                    {h.delta}
                                  </b>
                                  <span>{t.reasons[h.reason] ?? h.reason}</span>
                                  {h.note && <span className="text-ink-2">{h.note}</span>}
                                  <span className="text-steel">{date(h.createdAt)}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-ink-2">{t.noHistory}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="p-3">{formatNumber(r.inventory.onHand)}</td>
                  <td className="text-ink-2 p-3">{formatNumber(r.inventory.reserved)}</td>
                  <td
                    className={`p-3 font-bold ${r.available === 0 ? "text-bad" : low ? "text-copper" : ""}`}
                  >
                    {formatNumber(r.available)}
                  </td>
                  <td className="text-ink-2 p-3">{formatNumber(r.inventory.lowStockThreshold)}</td>
                  <td className="p-3">
                    <Link
                      href={link({ v: isOpen ? undefined : r.id })}
                      scroll={false}
                      className="text-copper whitespace-nowrap underline"
                    >
                      {isOpen ? fa.admin.catalog.category.cancel : t.adjust}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
