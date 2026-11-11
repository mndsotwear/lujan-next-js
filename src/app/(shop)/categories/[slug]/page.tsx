import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FilterPanel } from "@/components/catalog/FilterPanel";
import { Icon } from "@/components/Icon";
import { ProductCard } from "@/components/ProductCard";
import { fa } from "@/content/fa";
import {
  applyListing,
  parseListingParams,
  SORT_KEYS,
  specChips,
  toQueryString,
} from "@/modules/catalog";
import { getCategoryWithProducts } from "@/modules/catalog/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCategoryWithProducts(slug);
  if (!data) notFound(); // وضعیت ۴۰۴ واقعی قبل از شروع ارسال صفحه
  const brands = [...new Set(data.products.map((p) => p.brandName))];
  const description = fa.seo.categoryDescription(data.category.name, data.products.length, brands);
  return {
    title: data.category.name,
    description,
    // فیلتر و مرتب‌سازی نسخه‌ی تکراری همین صفحه‌اند
    alternates: { canonical: `/categories/${slug}` },
    openGraph: {
      type: "website",
      url: `/categories/${slug}`,
      title: data.category.name,
      description,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const data = await getCategoryWithProducts(slug);
  if (!data) notFound();
  const { category, products } = data;
  const lp = parseListingParams(await searchParams, category.specSchema);
  const brandNames = Object.fromEntries(products.map((p) => [p.brandSlug, p.brandName]));
  const r = applyListing(products, category.specSchema, lp, brandNames);
  const base = `/categories/${slug}`;

  // برچسب فیلترهای فعال، هر کدام با لینک حذف
  const chips: { label: string; href: string }[] = [];
  for (const b of lp.brands)
    chips.push({
      label: brandNames[b] ?? b,
      href: base + toQueryString({ ...lp, page: 1, brands: lp.brands.filter((x) => x !== b) }),
    });
  for (const [key, vals] of Object.entries(lp.specs)) {
    const facet = r.facets.find((f) => f.key === key);
    for (const v of vals) {
      const label = facet?.options.find((o) => o.value === v)?.label ?? v;
      const rest = vals.filter((x) => x !== v);
      const specs = { ...lp.specs, [key]: rest };
      if (!rest.length) delete specs[key];
      chips.push({ label, href: base + toQueryString({ ...lp, page: 1, specs }) });
    }
  }
  if (lp.minPrice || lp.maxPrice)
    chips.push({
      label: `${fa.category.price}: ${(lp.minPrice ?? 0).toLocaleString("fa-IR")} – ${(lp.maxPrice ?? r.priceBounds.max).toLocaleString("fa-IR")}`,
      href: base + toQueryString({ ...lp, page: 1, minPrice: null, maxPrice: null }),
    });
  if (lp.inStock)
    chips.push({
      label: fa.category.inStockOnly,
      href: base + toQueryString({ ...lp, page: 1, inStock: false }),
    });

  return (
    <main className="mx-auto max-w-[1240px] px-4">
      <Breadcrumbs
        path={`/categories/${category.slug}`}
        items={[{ label: fa.nav.home, href: "/" }, { label: category.name }]}
      />
      <h1 className="text-2xl font-bold">{category.name}</h1>

      <div className="mt-5 grid items-start gap-8 lg:grid-cols-[260px_1fr]">
        <FilterPanel facets={r.facets} params={lp} total={r.total} />
        <section aria-label={category.name}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <nav
              aria-label={fa.category.sort}
              className="flex flex-wrap items-center gap-1 text-sm"
            >
              <span className="text-steel">{fa.category.sort}:</span>
              {SORT_KEYS.map((k) => (
                <Link
                  key={k}
                  href={base + toQueryString({ ...lp, sort: k, page: 1 })}
                  scroll={false}
                  aria-current={lp.sort === k ? "true" : undefined}
                  className={`rounded-ctl px-2.5 py-1.5 ${lp.sort === k ? "bg-surface-2 text-ink font-bold" : "text-ink-2"}`}
                >
                  {fa.category.sorts[k]}
                </Link>
              ))}
            </nav>
            <span className="text-steel text-sm">{fa.category.count(r.total)}</span>
          </div>

          {chips.length > 0 && (
            <ul className="mb-4 flex flex-wrap gap-2">
              {chips.map((c) => (
                <li key={c.label}>
                  <Link
                    href={c.href}
                    scroll={false}
                    aria-label={fa.category.remove(c.label)}
                    className="border-ink bg-surface inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
                  >
                    {c.label}
                    <Icon name="close" className="size-3" />
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={base}
                  scroll={false}
                  className="text-copper inline-block px-2.5 py-1 text-xs"
                >
                  {fa.category.clearAll}
                </Link>
              </li>
            </ul>
          )}

          {r.items.length === 0 ? (
            <div className="rounded-card border-line bg-surface border p-8 text-center">
              <p className="font-bold">{fa.category.empty}</p>
              <p className="text-steel mt-1 text-sm">{fa.category.emptyHint}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-2 max-sm:gap-2">
              {r.items.map((p) => (
                <ProductCard key={p.id} p={p} specChips={specChips(category.specSchema, p.specs)} />
              ))}
            </div>
          )}

          {r.pages > 1 && (
            <nav aria-label={fa.category.pages} className="mt-8 flex justify-center gap-2">
              {Array.from({ length: r.pages }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={base + toQueryString({ ...lp, page: n })}
                  aria-label={fa.category.page(n)}
                  aria-current={n === r.page ? "page" : undefined}
                  className={`rounded-ctl grid size-10 place-items-center border text-sm ${n === r.page ? "border-ink bg-ink text-bg" : "border-line"}`}
                >
                  {n.toLocaleString("fa-IR")}
                </Link>
              ))}
            </nav>
          )}
        </section>
      </div>
    </main>
  );
}
