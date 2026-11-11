import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { fa } from "@/content/fa";
import { searchProducts } from "@/modules/search/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: fa.search.title, robots: { index: false } };

type Props = { searchParams: Promise<{ q?: string | string[] }> };

export default async function SearchPage({ searchParams }: Props) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 100) ?? "";
  const results = q ? await searchProducts(q) : [];
  return (
    <main className="mx-auto max-w-[1240px] px-4 py-8">
      <h1 className="text-2xl font-bold">{q ? fa.search.resultsFor(q) : fa.search.title}</h1>
      {q && <p className="text-steel mt-1 text-sm">{fa.category.count(results.length)}</p>}
      {!q && <p className="text-ink-2 mt-2">{fa.search.hint}</p>}
      {q && results.length === 0 && (
        <div className="rounded-card border-line bg-surface mt-6 border p-8">
          <p className="font-bold">{fa.search.empty(q)}</p>
          <p className="text-ink-2 mt-1 text-sm">{fa.search.emptyHint}</p>
          <Link
            href="/categories/instant-coffee"
            className="rounded-ctl border-ink mt-4 inline-grid min-h-11 place-items-center border-[1.5px] px-4 text-sm font-bold"
          >
            {fa.soon.cta}
          </Link>
        </div>
      )}
      {results.length > 0 && (
        <div className="mt-6 grid grid-cols-4 gap-4 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:gap-2">
          {results.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </main>
  );
}
