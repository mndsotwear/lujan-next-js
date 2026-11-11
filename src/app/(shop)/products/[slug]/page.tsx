import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BuyBox } from "@/components/catalog/BuyBox";
import { Icon } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { AskQuestion, WriteReview } from "@/components/catalog/ProductFeedback";
import { ProductGallery } from "@/components/catalog/ProductGallery";
import { RecentlyViewed } from "@/components/catalog/RecentlyViewed";
import { WishlistButton } from "@/components/catalog/WishlistButton";
import { RichText } from "@/components/RichText";
import { ProductCard } from "@/components/ProductCard";
import { Rating } from "@/components/Rating";
import { fa } from "@/content/fa";
import { formatSpecValue, specChips } from "@/modules/catalog";
import { getProductPage, requestStockNotification } from "@/modules/catalog/server";
import { absUrl, metaDescription, productLd } from "@/modules/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProductPage(slug);
  if (!data) notFound(); // وضعیت ۴۰۴ واقعی قبل از شروع ارسال صفحه
  const p = data.product;
  // خلاصه‌ی کوتاه (مثل «مقاوم به حرارت») به‌تنهایی توضیح خوبی نیست؛ با متن عمومی کامل می‌شود
  const generic = fa.seo.productDescription(p.name, p.brandName, data.category.name);
  const description = metaDescription(
    p.seoDescription,
    p.summary && p.summary.length >= 60 ? p.summary : null,
    p.description,
    p.summary ? `${p.summary} — ${generic}` : generic,
  );
  const image = p.images[0];
  return {
    title: p.seoTitle || p.name,
    description,
    alternates: { canonical: `/products/${slug}` },
    openGraph: {
      type: "website",
      url: `/products/${slug}`,
      title: p.seoTitle || p.name,
      description,
      ...(image ? { images: [{ url: absUrl(image.url), alt: image.alt }] } : {}),
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const data = await getProductPage(slug);
  if (!data) notFound();
  const { product: p, category, variants, reviews, questions, complements, related } = data;
  const keySpecs = category.specSchema.filter((f) => p.specs[f.key] !== undefined).slice(0, 3);
  const variantViews = variants.map((v) => ({
    ...v,
    label: Object.values(v.attributes).join("، ") || p.name,
  }));

  return (
    <main className="mx-auto max-w-[1240px] px-4">
      <Breadcrumbs
        path={`/products/${p.slug}`}
        items={[
          { label: fa.nav.home, href: "/" },
          { label: category.name, href: `/categories/${category.slug}` },
          { label: p.name },
        ]}
      />
      <JsonLd
        data={productLd({
          name: p.name,
          slug: p.slug,
          description: metaDescription(p.seoDescription, p.summary, p.description),
          brandName: p.brandName,
          images: p.images.map((i) => i.url),
          ratingAvg: p.ratingAvg,
          ratingCount: p.ratingCount,
          variants: variants.map((v) => ({ sku: v.sku, price: v.price, stock: v.stock })),
        })}
      />

      <div className="grid items-start gap-12 max-md:gap-6 md:grid-cols-[1.1fr_1fr]">
        <ProductGallery images={p.images} icon={p.icon} tag={p.tags[0]} />

        <div>
          <span className="text-steel text-sm">{p.brandName}</span>
          <h1 className="mt-1 mb-2 text-2xl leading-normal font-bold">{p.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Rating avg={p.ratingAvg} count={p.ratingCount} />
            {p.ratingCount > 0 && (
              <a href="#reviews" className="text-ink-2 underline-offset-4 hover:underline">
                {fa.card.reviews(p.ratingCount)}
              </a>
            )}
          </div>

          {keySpecs.length > 0 && (
            <dl className="my-5 grid grid-cols-3 gap-2">
              {keySpecs.map((f) => (
                <div
                  key={f.key}
                  className="rounded-ctl border-line bg-surface text-steel border p-3 text-xs"
                >
                  <dt>{f.label}</dt>
                  <dd className="text-ink text-sm font-bold">
                    {formatSpecValue(f, p.specs[f.key])}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          <BuyBox
            variants={variantViews}
            notifyAction={requestStockNotification}
            productName={p.name}
          />
          <div className="mt-3">
            <WishlistButton productId={p.id} slug={p.slug} />
          </div>

          <ul className="mt-4 grid gap-2 text-sm">
            <li className="flex items-center gap-2">
              <Icon name="shield" className="text-copper size-5" />
              {p.warrantyMonths ? fa.product.warranty(p.warrantyMonths) : fa.product.noWarranty}
              {p.warrantyNote ? ` — ${p.warrantyNote}` : ""}
            </li>
            <li className="flex items-center gap-2">
              <Icon name="return" className="text-copper size-5" />
              <Link href="/returns" className="underline-offset-4 hover:underline">
                {fa.product.returns}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <nav
        aria-label={fa.product.specs}
        className="border-line bg-bg sticky top-[110px] z-[4] mt-16 flex gap-5 overflow-x-auto border-b text-sm max-sm:top-[150px]"
      >
        {(["specs", "together", "description", "reviews", "qa"] as const).map((k) => (
          <a
            key={k}
            href={`#${k}`}
            className="text-ink-2 hover:text-ink border-b-2 border-transparent py-3 whitespace-nowrap"
          >
            {fa.product.tabs[k]}
          </a>
        ))}
      </nav>

      <section id="specs" className="scroll-mt-40 pt-8">
        <h2 className="mb-4 text-xl font-bold">{fa.product.specs}</h2>
        <table className="w-full max-w-3xl border-collapse text-sm">
          <tbody>
            {category.specSchema.map((f) => {
              const val = formatSpecValue(f, p.specs[f.key]);
              return val ? (
                <tr key={f.key} className="border-line border-b">
                  <th scope="row" className="text-steel w-[38%] px-4 py-3 text-start font-normal">
                    {f.label}
                  </th>
                  <td className="px-4 py-3">{val}</td>
                </tr>
              ) : null;
            })}
            <tr className="border-line border-b">
              <th scope="row" className="text-steel w-[38%] px-4 py-3 text-start font-normal">
                {fa.product.warrantyLabel}
              </th>
              <td className="px-4 py-3">
                {p.warrantyMonths ? fa.product.warranty(p.warrantyMonths) : fa.product.noWarranty}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section id="together" className="scroll-mt-40 pt-8">
        <h2 className="mb-4 text-xl font-bold">{fa.product.together}</h2>
        {complements.length > 0 ? (
          <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:gap-2">
            {complements.map((c) => (
              <ProductCard key={c.id} p={c} reason={c.reason} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:gap-2">
            {related.map((c) => (
              <ProductCard key={c.id} p={c} specChips={specChips(category.specSchema, c.specs)} />
            ))}
          </div>
        )}
      </section>

      {p.description && (
        <section id="description" className="scroll-mt-40 pt-8">
          <h2 className="mb-4 text-xl font-bold">{fa.product.description}</h2>
          <RichText text={p.description} className="text-ink-2 max-w-[68ch]" />
        </section>
      )}

      <section id="reviews" className="scroll-mt-40 pt-8">
        <h2 className="mb-4 text-xl font-bold">{fa.product.reviews}</h2>
        {reviews.length === 0 ? (
          <p className="text-steel text-sm">{fa.product.noReviews}</p>
        ) : (
          <ul>
            {reviews.map((r) => (
              <li key={r.id} className="border-line border-b py-4">
                <div className="flex items-center gap-3 text-sm">
                  <b>{r.name ?? "—"}</b>
                  {r.verified && (
                    <span className="rounded-chip text-ok border border-current px-1.5 text-xs">
                      {fa.product.buyer}
                    </span>
                  )}
                  <Rating avg={r.rating} count={1} showCount={false} />
                </div>
                {r.body && <p className="text-ink-2 mt-2 text-sm">{r.body}</p>}
              </li>
            ))}
          </ul>
        )}
        <WriteReview productId={p.id} />
      </section>

      <section id="qa" className="scroll-mt-40 pt-8">
        <h2 className="mb-4 text-xl font-bold">{fa.product.qa}</h2>
        {questions.length === 0 ? (
          <p className="text-steel text-sm">{fa.product.noQuestions}</p>
        ) : (
          <ul>
            {questions.map((q) => (
              <li key={q.id} className="border-line border-b py-4 text-sm">
                <b>{q.body}</b>
                <p className="border-copper text-ink-2 mt-2 border-s-2 ps-4">
                  {q.answer} — {fa.product.storeAnswer}
                </p>
              </li>
            ))}
          </ul>
        )}
        <AskQuestion productId={p.id} slug={p.slug} />
      </section>

      <RecentlyViewed currentId={p.id} />

      {complements.length > 0 && related.length > 0 && (
        <section className="pt-12">
          <h2 className="mb-4 text-xl font-bold">{fa.product.related}</h2>
          <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:gap-2">
            {related.map((c) => (
              <ProductCard key={c.id} p={c} specChips={specChips(category.specSchema, c.specs)} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
