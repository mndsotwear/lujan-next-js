/**
 * سئو: نشانی کامل، توضیح متا و داده‌ی ساختاریافته‌ی Schema.org (FR-SEO-02، FR-SEO-03) — منطق خالص.
 */
import { richTextPlain as plainText } from "@/modules/catalog";

export const siteUrl = (): string =>
  (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const absUrl = (path: string): string =>
  /^https?:\/\//.test(path) ? path : `${siteUrl()}${path.startsWith("/") ? "" : "/"}${path}`;

/** توضیح متا: بدون قالب، یک خط، حداکثر ~۱۶۰ نویسه و بریده روی مرز کلمه */
export function metaDescription(...candidates: (string | null | undefined)[]): string | undefined {
  const text = candidates.map((c) => (c ? plainText(c) : "")).find((c) => c.length > 0);
  if (!text) return undefined;
  if (text.length <= 160) return text;
  const cut = text.slice(0, 157);
  const space = cut.lastIndexOf(" ");
  return `${(space > 100 ? cut.slice(0, space) : cut).trim()}…`;
}

/** JSON-LD امن برای <script>: بستن تگ و جداکننده‌های خط یونیکد شکسته می‌شوند */
export const jsonLdString = (data: unknown): string =>
  JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

export type Crumb = { label: string; href?: string };

export function breadcrumbLd(items: Crumb[], currentPath: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.label,
      item: absUrl(it.href ?? currentPath),
    })),
  };
}

const AVAILABILITY = {
  in_stock: "https://schema.org/InStock",
  low: "https://schema.org/LimitedAvailability",
  out: "https://schema.org/OutOfStock",
} as const;

/** ریال ایران (IRR) کد رسمی است؛ قیمت‌های سایت تومان‌اند */
const toRial = (toman: number) => toman * 10;

export type ProductLdInput = {
  name: string;
  slug: string;
  description?: string;
  brandName: string;
  images: string[];
  ratingAvg: number;
  ratingCount: number;
  variants: { sku: string; price: number; stock: keyof typeof AVAILABILITY }[];
};

export function productLd(p: ProductLdInput) {
  const url = absUrl(`/products/${p.slug}`);
  const offers = p.variants.map((v) => ({
    "@type": "Offer",
    sku: v.sku,
    price: toRial(v.price),
    priceCurrency: "IRR",
    availability: AVAILABILITY[v.stock],
    itemCondition: "https://schema.org/NewCondition",
    url,
  }));
  const prices = p.variants.map((v) => toRial(v.price));
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    url,
    ...(p.description ? { description: p.description } : {}),
    ...(p.images.length ? { image: p.images.map(absUrl) } : {}),
    ...(p.variants.length === 1 ? { sku: p.variants[0]!.sku } : {}),
    brand: { "@type": "Brand", name: p.brandName },
    ...(p.ratingCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Math.round(p.ratingAvg * 10) / 10,
            reviewCount: p.ratingCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    ...(offers.length === 1
      ? { offers: offers[0] }
      : offers.length > 1
        ? {
            offers: {
              "@type": "AggregateOffer",
              priceCurrency: "IRR",
              lowPrice: Math.min(...prices),
              highPrice: Math.max(...prices),
              offerCount: offers.length,
              offers,
            },
          }
        : {}),
  };
}

export type StoreExtra = {
  address?: string | null;
  phone?: string | null;
  geo?: { lat: number; lng: number } | null;
  hours?: { days: number[]; open: string; close: string }[];
};
const SCHEMA_DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export function storeLd(
  name: string,
  description: string,
  city: string,
  province: string,
  extra: StoreExtra = {},
) {
  const url = siteUrl();
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name,
      url,
      inLanguage: "fa-IR",
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${url}/search?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Store",
      name,
      description,
      url,
      address: {
        "@type": "PostalAddress",
        ...(extra.address ? { streetAddress: extra.address } : {}),
        addressLocality: city,
        addressRegion: province,
        addressCountry: "IR",
      },
      ...(extra.phone ? { telephone: extra.phone } : {}),
      ...(extra.geo
        ? { geo: { "@type": "GeoCoordinates", latitude: extra.geo.lat, longitude: extra.geo.lng } }
        : {}),
      ...(extra.hours?.length
        ? {
            openingHoursSpecification: extra.hours.map((h) => ({
              "@type": "OpeningHoursSpecification",
              dayOfWeek: h.days.map((d) => SCHEMA_DAYS[d]),
              opens: h.open,
              closes: h.close,
            })),
          }
        : {}),
    },
  ];
}

export function articleLd(a: {
  title: string;
  slug: string;
  description?: string;
  image?: string | null;
  publishedAt: Date;
  updatedAt: Date;
  section: string;
  tags: string[];
  siteName: string;
}) {
  const org = { "@type": "Organization", name: a.siteName, url: siteUrl() };
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title.slice(0, 110),
    url: absUrl(`/blog/${a.slug}`),
    mainEntityOfPage: absUrl(`/blog/${a.slug}`),
    ...(a.description ? { description: a.description } : {}),
    ...(a.image ? { image: [absUrl(a.image)] } : {}),
    datePublished: a.publishedAt.toISOString(),
    dateModified: a.updatedAt.toISOString(),
    articleSection: a.section,
    ...(a.tags.length ? { keywords: a.tags.join(", ") } : {}),
    inLanguage: "fa-IR",
    author: org,
    publisher: org,
  };
}
