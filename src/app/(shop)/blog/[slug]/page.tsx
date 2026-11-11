import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PostCard, faDate } from "@/components/content/PostCard";
import { JsonLd } from "@/components/JsonLd";
import { ProductCard } from "@/components/ProductCard";
import { RichText } from "@/components/RichText";
import { fa } from "@/content/fa";
import { staffWith } from "@/modules/admin/server";
import { getProductSummaries } from "@/modules/catalog/server";
import { readingMinutes } from "@/modules/content";
import { getPost, morePosts } from "@/modules/content/server";
import { absUrl, articleLd, metaDescription } from "@/modules/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

/** پیش‌نویس فقط برای کارکنان دارای مجوز محتوا (پیش‌نمایش) */
async function load(slug: string) {
  const live = await getPost(slug);
  if (live) return live;
  return (await staffWith("content.manage")) ? getPost(slug, true) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) notFound();
  const description = metaDescription(p.seoDescription, p.excerpt, p.body);
  return {
    title: p.seoTitle || p.title,
    description,
    alternates: { canonical: `/blog/${p.slug}` },
    ...(p.live ? {} : { robots: { index: false, follow: false } }),
    openGraph: {
      type: "article",
      url: `/blog/${p.slug}`,
      title: p.seoTitle || p.title,
      description,
      ...(p.publishedAt ? { publishedTime: p.publishedAt.toISOString() } : {}),
      modifiedTime: p.updatedAt.toISOString(),
      ...(p.coverImage ? { images: [{ url: absUrl(p.coverImage), alt: p.coverAlt ?? "" }] } : {}),
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) notFound();
  const t = fa.blog;
  const sectionName = t.sections[p.section] ?? p.section;
  const [products, more] = await Promise.all([
    getProductSummaries(p.productIds),
    morePosts(p.section, p.id),
  ]);
  return (
    <main className="mx-auto max-w-[1240px] px-4">
      {!p.live && (
        <p role="status" className="bg-warn/15 text-ink rounded-ctl mt-4 p-3 text-sm">
          {t.draftBanner}
        </p>
      )}
      <Breadcrumbs
        path={`/blog/${p.slug}`}
        items={[
          { label: fa.nav.home, href: "/" },
          { label: t.title, href: "/blog" },
          { label: sectionName, href: `/blog?section=${p.section}` },
          { label: p.title },
        ]}
      />
      {p.live && p.publishedAt && (
        <JsonLd
          data={articleLd({
            title: p.title,
            slug: p.slug,
            description: metaDescription(p.seoDescription, p.excerpt, p.body),
            image: p.coverImage,
            publishedAt: p.publishedAt,
            updatedAt: p.updatedAt,
            section: sectionName,
            tags: p.tags,
            siteName: fa.site.name,
          })}
        />
      )}
      <article className="mx-auto max-w-[72ch]">
        <header className="space-y-3">
          <p className="text-steel text-sm">
            {sectionName}
            {p.publishedAt ? ` · ${faDate(p.publishedAt)}` : ""} ·{" "}
            {t.minutes(readingMinutes(p.body))}
          </p>
          <h1 className="text-3xl leading-[1.5] font-black">{p.title}</h1>
          {p.excerpt && <p className="text-ink-2 text-lg leading-8">{p.excerpt}</p>}
        </header>
        {p.coverImage && (
          <div className="rounded-card bg-surface-2 relative mt-6 aspect-[1200/630] overflow-hidden">
            <Image
              src={p.coverImage}
              alt={p.coverAlt ?? ""}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 720px"
              className="object-cover"
            />
          </div>
        )}
        <RichText text={p.body} className="mt-8 text-[17px]" />
        {p.tags.length > 0 && (
          <ul className="mt-8 flex flex-wrap gap-2">
            {p.tags.map((tag) => (
              <li key={tag}>
                <Link
                  href={`/blog?tag=${encodeURIComponent(tag)}`}
                  className="rounded-chip border-line hover:border-ink border px-3 py-1 text-sm"
                >
                  #{tag}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </article>

      {products.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-xl font-bold">{t.related}</h2>
          <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:gap-2">
            {products.map((c) => (
              <ProductCard key={c.id} p={c} />
            ))}
          </div>
        </section>
      )}

      {more.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-xl font-bold">{t.more}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((m) => (
              <PostCard key={m.slug} p={m} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
