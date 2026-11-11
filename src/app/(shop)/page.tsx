import type { Metadata } from "next";
import Link from "next/link";
import { Finder } from "@/components/catalog/Finder";
import { CategoryStrip } from "@/components/home/CategoryStrip";
import { HeroSlider, type Slide } from "@/components/home/HeroSlider";
import { ProductRail } from "@/components/home/ProductRail";
import { Icon } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { RecentlyViewed } from "@/components/catalog/RecentlyViewed";
import { fa } from "@/content/fa";
import {
  getBestsellers,
  getDiscounted,
  getNavCategories,
  getNewest,
} from "@/modules/catalog/server";
import { getActiveBanners } from "@/modules/content/server";
import { storeLd } from "@/modules/seo";
import { STORE } from "@/config/store";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/", title: fa.site.name, description: fa.site.description },
};

// پویا به‌خاطر سبد و ورود در سربرگ؛ پرس‌وجوهای کاتالوگ کش می‌شوند (D-016، lib/cache.ts)
export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const deleted = (await searchParams).account === "deleted";
  const categories = await getNavCategories();
  const [best, discounted, newest, banners, ...byCategory] = await Promise.all([
    getBestsellers(10),
    getDiscounted(10),
    getNewest(10),
    getActiveBanners(),
    ...categories.slice(0, 3).map((c) => getBestsellers(10, c.slug)),
  ]);
  const schemaOf = new Map(categories.map((c) => [c.slug, c.specSchema]));
  // بنرهای مدیر در پنل جای اسلایدهای پیش‌فرض را می‌گیرند
  const slides: Slide[] =
    banners.length > 0
      ? banners.map((b) => ({
          id: b.id,
          title: b.title,
          subtitle: b.subtitle,
          href: b.link ?? "/",
          cta: fa.home.heroPrimary,
          image: b.imageDesktop,
          alt: b.alt,
        }))
      : fa.home.slides.map((x) => ({ ...x }));
  return (
    <main className="mx-auto max-w-[1240px] space-y-12 px-4 pt-5">
      {deleted && (
        <p role="status" className="rounded-ctl bg-surface-2 p-3 text-sm">
          {fa.account.deleted}
        </p>
      )}
      <JsonLd
        data={storeLd(
          fa.site.name,
          fa.site.description,
          STORE.storeLocation.city,
          STORE.storeLocation.province,
          STORE.storeInfo,
        )}
      />
      <h1 className="sr-only">
        {fa.site.name} — {fa.site.tagline}
      </h1>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
        <HeroSlider slides={slides} />
        <div className="grid gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
          {fa.home.promos.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className={`rounded-sheet shadow-card group relative isolate flex min-h-[150px] flex-col justify-center gap-1 overflow-hidden bg-gradient-to-br p-6 lg:min-h-[192px] ${p.bg}`}
            >
              <Icon
                name={p.icon}
                aria-hidden
                className="text-ink/15 absolute end-3 -bottom-4 -z-0 size-36 transition-transform group-hover:scale-110"
              />
              <b className="relative text-xl font-black">{p.title}</b>
              <span className="text-ink-2 relative text-sm">{p.sub}</span>
              <span className="bg-ink relative mt-2 inline-grid min-h-9 w-fit place-items-center rounded-full px-4 text-xs font-bold text-white">
                {fa.home.heroPrimary}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <CategoryStrip categories={categories} />

      <ProductRail
        tone="brand"
        eyebrow={fa.home.railDiscountTag}
        title={fa.home.railDiscount}
        href="/categories/instant-coffee"
        products={discounted}
        schemaOf={schemaOf}
      />

      <section
        aria-label={fa.home.trust[0].title}
        className="rounded-sheet border-line bg-surface shadow-card grid grid-cols-4 gap-6 border p-6 max-md:grid-cols-2"
      >
        {fa.home.trust.map((t) => (
          <div key={t.title} className="flex items-center gap-3.5">
            <span className="bg-copper-soft text-copper grid size-12 shrink-0 place-items-center rounded-full">
              <Icon name={t.icon} className="size-6" />
            </span>
            <div>
              <b className="block font-bold">{t.title}</b>
              <small className="text-steel block text-[13px]">{t.sub}</small>
            </div>
          </div>
        ))}
      </section>

      <ProductRail
        eyebrow="محبوب مشتری‌ها"
        title={fa.home.railBest}
        products={best}
        schemaOf={schemaOf}
      />

      <section
        id="finder"
        className="rounded-sheet from-copper-soft to-surface border-line grid scroll-mt-40 items-center gap-8 border bg-gradient-to-br p-6 sm:p-10 md:grid-cols-[1.1fr_1fr]"
      >
        <div>
          <h2 className="mb-3 text-[length:clamp(1.6rem,4vw,2.4rem)] leading-snug font-black">
            {fa.home.finderTitle}
          </h2>
          <p className="text-ink-2 max-w-[46ch]">{fa.home.finderSub}</p>
        </div>
        <div className="bg-surface rounded-sheet shadow-card p-5 sm:p-6">
          <Finder />
        </div>
      </section>

      <ProductRail eyebrow="جدید" title={fa.home.railNew} products={newest} schemaOf={schemaOf} />

      {byCategory.map((items, i) => {
        const c = categories[i];
        if (!c) return null;
        return (
          <ProductRail
            key={c.slug}
            title={c.name}
            href={`/categories/${c.slug}`}
            products={items}
            schemaOf={schemaOf}
          />
        );
      })}

      <section className="rounded-sheet grid gap-8 bg-[#0b1f4d] p-8 text-white sm:p-12 md:grid-cols-[1.3fr_1fr]">
        <div>
          <h2 className="mb-3 text-3xl font-black tracking-tight">{fa.home.b2bTitle}</h2>
          <p className="mb-6 max-w-[48ch] text-lg text-white/80">{fa.home.b2bBody}</p>
          <span
            className="inline-grid min-h-12 place-items-center rounded-full bg-white px-7 font-bold text-[#0b1f4d]"
            title={fa.home.b2bSoon}
          >
            {fa.home.b2bCta}
          </span>
          <p className="mt-3 text-xs text-white/60">{fa.home.b2bSoon}</p>
        </div>
        <ul className="grid content-center gap-1 divide-y divide-white/15">
          {fa.home.b2bPoints.map((pt) => (
            <li key={pt} className="flex gap-3 py-3">
              <Icon name="check" className="mt-1 size-5 shrink-0 text-[#7db0ff]" />
              {pt}
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-sheet border-line text-steel bg-surface-2 grid min-h-[200px] place-items-center border text-sm">
          {fa.home.mapPlaceholder}
        </div>
        <div className="rounded-sheet border-line bg-surface shadow-card border p-6">
          <h2 className="mb-2 text-2xl font-black tracking-tight">{fa.home.storeTitle}</h2>
          <p className="text-ink-2">{fa.home.storeBody}</p>
          <dl className="my-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-steel">{fa.home.storeAddress}</dt>
            <dd>{fa.home.storeAddressValue}</dd>
            <dt className="text-steel">{fa.home.storeHours}</dt>
            <dd>{fa.home.storeHoursValue}</dd>
            <dt className="text-steel">{fa.home.storePhone}</dt>
            <dd>{fa.home.storePhoneValue}</dd>
          </dl>
        </div>
      </section>
      <RecentlyViewed />
    </main>
  );
}
