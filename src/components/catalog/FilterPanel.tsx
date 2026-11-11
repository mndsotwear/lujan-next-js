"use client";
/**
 * فیلترهای دسته (FR-CAT-02) — هر تغییر فوراً به URL می‌رود (قابل اشتراک و بوک‌مارک).
 * دسکتاپ: ستون کناری چسبنده. موبایل: پنل کشویی از پایین با دکمه‌ی «نمایش n کالا».
 */
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { fa } from "@/content/fa";
import { toLatinDigits } from "@/lib/format";
import { type Facet, type ListingParams, toQueryString } from "@/modules/catalog";
import { Icon } from "../Icon";

type Props = { facets: Facet[]; params: ListingParams; total: number };

export function FilterPanel({ facets, params, total }: Props) {
  const router = useRouter();
  const path = usePathname();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const activeCount =
    params.brands.length +
    Object.values(params.specs).reduce((s, v) => s + v.length, 0) +
    (params.minPrice || params.maxPrice ? 1 : 0) +
    (params.inStock ? 1 : 0);

  const go = (next: ListingParams) =>
    start(() => router.replace(`${path}${toQueryString({ ...next, page: 1 })}`, { scroll: false }));

  const toggle = (key: string, value: string) => {
    if (key === "brand") {
      const brands = params.brands.includes(value)
        ? params.brands.filter((b) => b !== value)
        : [...params.brands, value];
      go({ ...params, brands });
    } else {
      const cur = params.specs[key] ?? [];
      const vals = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      const specs = { ...params.specs, [key]: vals };
      if (!vals.length) delete specs[key];
      go({ ...params, specs });
    }
  };

  const priceForm = (
    <form
      className="mt-2 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const num = (k: string) =>
          Number(toLatinDigits(String(f.get(k) ?? "")).replace(/[^\d]/g, "")) || null;
        go({ ...params, minPrice: num("min"), maxPrice: num("max") });
      }}
    >
      <label className="sr-only" htmlFor="pmin">
        {fa.category.from}
      </label>
      <input
        id="pmin"
        name="min"
        inputMode="numeric"
        placeholder={fa.category.from}
        defaultValue={params.minPrice ?? ""}
        className="rounded-ctl border-line bg-surface w-full min-w-0 border-[1.5px] px-2 py-1.5 text-sm"
      />
      <label className="sr-only" htmlFor="pmax">
        {fa.category.to}
      </label>
      <input
        id="pmax"
        name="max"
        inputMode="numeric"
        placeholder={fa.category.to}
        defaultValue={params.maxPrice ?? ""}
        className="rounded-ctl border-line bg-surface w-full min-w-0 border-[1.5px] px-2 py-1.5 text-sm"
      />
      <button type="submit" className="rounded-ctl border-ink border-[1.5px] px-3 text-sm">
        {fa.category.apply}
      </button>
    </form>
  );

  const body = (
    <div className={pending ? "opacity-60 transition-opacity" : ""}>
      <label className="flex items-center justify-between py-2 text-sm font-bold">
        {fa.category.inStockOnly}
        <input
          type="checkbox"
          checked={params.inStock}
          onChange={() => go({ ...params, inStock: !params.inStock })}
          className="accent-copper size-[18px]"
        />
      </label>
      <details className="border-line border-b py-3" open>
        <summary className="cursor-pointer text-sm font-bold">{fa.category.price}</summary>
        {priceForm}
      </details>
      {facets.map((f) => (
        <details key={f.key} className="border-line border-b py-3 last:border-0" open>
          <summary className="cursor-pointer text-sm font-bold">{f.label}</summary>
          {f.options.map((o) => (
            <label
              key={o.value}
              className={`flex cursor-pointer items-center gap-2 py-1.5 text-sm ${o.count === 0 && !o.selected ? "opacity-50" : ""}`}
            >
              <input
                type="checkbox"
                checked={o.selected}
                disabled={o.count === 0 && !o.selected}
                onChange={() => toggle(f.key, o.value)}
                className="accent-copper size-[18px]"
              />
              {o.label}
              <small className="text-steel ms-auto">{o.count.toLocaleString("fa-IR")}</small>
            </label>
          ))}
        </details>
      ))}
    </div>
  );

  return (
    <>
      <aside
        aria-label={fa.category.filters}
        className="rounded-card border-line bg-surface sticky top-[120px] hidden border px-4 py-2 lg:block"
      >
        {body}
      </aside>
      <div className="bg-bg sticky top-[104px] z-10 flex gap-2 py-2 max-sm:top-[150px] lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-ctl border-line bg-surface inline-flex min-h-10 items-center gap-1.5 border px-3 text-sm"
        >
          <Icon name="filter" className="size-[18px]" />
          {fa.category.filters}
          {activeCount > 0 && <b>({activeCount.toLocaleString("fa-IR")})</b>}
        </button>
      </div>
      {open && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={fa.category.filters}
        >
          <button
            type="button"
            aria-label={fa.category.apply}
            className="absolute inset-0 bg-black/45"
            onClick={() => setOpen(false)}
          />
          <div className="rounded-t-sheet bg-surface shadow-sheet absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col">
            <div className="border-line flex items-center justify-between border-b px-5 py-4">
              <b className="text-lg">{fa.category.filters}</b>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-11 place-items-center"
                aria-label={fa.category.apply}
              >
                <Icon name="close" className="size-[22px]" />
              </button>
            </div>
            <div className="overflow-auto px-5">{body}</div>
            <div className="border-line border-t px-5 py-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-ctl bg-copper text-copper-ink min-h-12 w-full font-bold"
              >
                {fa.category.showResults(total)}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
