import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { TasteFinder } from "@/components/catalog/TasteFinder";
import { ProductCard } from "@/components/ProductCard";
import { fa } from "@/content/fa";
import { flavorLabel, parseTaste, rankByTaste } from "@/modules/catalog/flavors";
import { getNavCategories, getTasteProducts } from "@/modules/catalog/server";

export const metadata: Metadata = {
  title: fa.taste.title,
  description: fa.taste.metaDescription,
  alternates: { canonical: "/taste" },
};

/** «طعم‌یاب»: محصولات بر اساس طعم دلخواه مشتری */
export default async function TastePage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string | string[]; q?: string | string[]; c?: string | string[] }>;
}) {
  const raw = await searchParams;
  const { picked, q, wanted } = parseTaste(raw);
  const cRaw = Array.isArray(raw.c) ? raw.c[0] : raw.c;
  const [categories, products] = await Promise.all([getNavCategories(), getTasteProducts()]);
  const category = categories.some((c) => c.slug === cRaw) ? cRaw! : "";
  const pool = category ? products.filter((p) => p.categorySlug === category) : products;
  const results = rankByTaste(pool, wanted);
  const t = fa.taste;

  return (
    <main className="mx-auto max-w-[1240px] px-4">
      <Breadcrumbs path="/taste" items={[{ label: fa.nav.home, href: "/" }, { label: t.title }]} />
      <section className="rounded-sheet from-copper-soft to-surface border-line mb-8 border bg-gradient-to-br p-5 sm:p-8">
        <h1 className="text-2xl font-black sm:text-3xl">{t.title}</h1>
        <p className="text-ink-2 mt-1 mb-5 text-sm">{t.intro}</p>
        <TasteFinder
          picked={picked}
          q={q}
          category={category}
          categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        />
      </section>

      {wanted.length === 0 ? (
        <p className="text-ink-2 py-10 text-center">{q ? t.noFlavorInText : t.start}</p>
      ) : (
        <section aria-label={t.results}>
          <p className="mb-4 text-sm">
            {t.resultsFor(wanted.map(flavorLabel).join("، "), results.length)}
          </p>
          {results.length ? (
            <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:gap-2">
              {results.map((p) => (
                <ProductCard key={p.id} p={p} reason={p.matched.map(flavorLabel).join(" · ")} />
              ))}
            </div>
          ) : (
            <p className="text-ink-2 py-10 text-center">{t.empty}</p>
          )}
        </section>
      )}
    </main>
  );
}
