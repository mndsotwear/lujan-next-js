import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CouponBox } from "@/components/content/CouponBox";
import { faDate } from "@/components/content/PostCard";
import { ProductCard } from "@/components/ProductCard";
import { RichText } from "@/components/RichText";
import { fa } from "@/content/fa";
import { getProductSummaries } from "@/modules/catalog/server";
import { getLiveLanding } from "@/modules/content/server";
import { absUrl, metaDescription } from "@/modules/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const l = await getLiveLanding(slug);
  if (!l) notFound();
  const description = metaDescription(l.seoDescription, l.intro);
  return {
    title: l.title,
    description,
    alternates: { canonical: `/offers/${l.slug}` },
    openGraph: {
      type: "website",
      url: `/offers/${l.slug}`,
      title: l.title,
      description,
      ...(l.coverImage ? { images: [{ url: absUrl(l.coverImage), alt: l.coverAlt ?? "" }] } : {}),
    },
  };
}

/** صفحه‌ی فرود کمپین (FR-SEO-05) — بیرون از بازه یا خاموش: ۴۰۴ */
export default async function LandingPage({ params }: Props) {
  const { slug } = await params;
  const l = await getLiveLanding(slug);
  if (!l) notFound();
  const products = await getProductSummaries(l.productIds);
  return (
    <main className="mx-auto max-w-[1240px] px-4">
      <Breadcrumbs
        path={`/offers/${l.slug}`}
        items={[{ label: fa.nav.home, href: "/" }, { label: l.title }]}
      />
      {l.coverImage && (
        <div className="rounded-sheet bg-surface-2 relative mb-6 aspect-[16/6] overflow-hidden max-sm:aspect-[4/3]">
          <Image
            src={l.coverImage}
            alt={l.coverAlt ?? ""}
            fill
            priority
            sizes="(max-width: 1120px) 100vw, 1120px"
            className="object-cover"
          />
        </div>
      )}
      <div className="grid items-start gap-6 md:grid-cols-[1fr_auto]">
        <div>
          <h1 className="text-3xl leading-[1.5] font-black">{l.title}</h1>
          {l.endsAt && (
            <p className="text-copper mt-1 text-sm font-bold">
              {fa.landing.until(faDate(l.endsAt))}
            </p>
          )}
          {l.intro && <RichText text={l.intro} className="text-ink-2 mt-3 max-w-[68ch]" />}
        </div>
        {l.couponCode && <CouponBox code={l.couponCode} />}
      </div>
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold">{fa.landing.products}</h2>
        <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:gap-2">
          {products.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>
    </main>
  );
}
