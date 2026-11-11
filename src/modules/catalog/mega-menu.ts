/**
 * داده‌ی مگامنوی دسته‌ها (D-067) — منطق خالص، بدون پایگاه داده.
 * هر دسته: زیردسته‌ها (اگر در پنل تعریف شده باشند)، گزینه‌های فیلترهای اصلی همان دسته (مثل «نوع موتور»)،
 * برندهایی که در آن دسته کالا دارند و پرفروش‌ترین کالای موجود به‌عنوان پیشنهاد.
 * فقط گزینه‌هایی نشان داده می‌شوند که دست‌کم یک کالا دارند؛ پس هیچ پیوندی به فهرست خالی نمی‌رود.
 */
import type { SpecSchema } from "./specs";
import type { ProductSummary } from "./types";

export type MegaLink = { label: string; href: string };
export type MegaGroup = { title: string; links: MegaLink[] };
export type MegaBrand = { name: string; logoUrl: string | null; href: string };
export type MegaFeatured = {
  name: string;
  href: string;
  price: number;
  oldPrice: number | null;
  image: { url: string; alt: string } | null;
  icon: string;
};
export type MegaCategory = {
  slug: string;
  name: string;
  icon: string;
  href: string;
  count: number;
  groups: MegaGroup[];
  brands: MegaBrand[];
  featured: MegaFeatured | null;
};

export type MegaInput = {
  slug: string;
  name: string;
  icon: string;
  specSchema: SpecSchema;
  children: { slug: string; name: string }[];
};

export const MEGA_LABELS = { children: "زیردسته‌ها", popular: "محبوب‌ها" } as const;
const MAX_GROUPS = 3;
const MAX_LINKS = 6;

export function buildMegaMenu(
  categories: MegaInput[],
  products: ProductSummary[],
  brands: { slug: string; name: string; logoUrl: string | null }[],
): MegaCategory[] {
  const brandBySlug = new Map(brands.map((b) => [b.slug, b]));
  return categories.map((c) => {
    const href = `/categories/${c.slug}`;
    const items = products.filter((p) => p.categorySlug === c.slug);
    const groups: MegaGroup[] = [];

    if (c.children.length)
      groups.push({
        title: MEGA_LABELS.children,
        links: c.children
          .slice(0, MAX_LINKS)
          .map((s) => ({ label: s.name, href: `/categories/${s.slug}` })),
      });

    for (const f of c.specSchema) {
      if (groups.length >= MAX_GROUPS) break;
      if (f.type !== "enum" || !f.filterable) continue;
      const links = f.options
        .filter((o) => items.some((p) => p.specs[f.key] === o.value))
        .slice(0, MAX_LINKS)
        .map((o) => ({ label: o.label, href: `${href}?${f.key}=${encodeURIComponent(o.value)}` }));
      if (links.length) groups.push({ title: f.label, links });
    }

    const ranked = [...items].sort((a, b) => b.soldCount - a.soldCount);
    if (groups.length < 2 && ranked.length)
      groups.push({
        title: MEGA_LABELS.popular,
        links: ranked
          .slice(0, MAX_LINKS)
          .map((p) => ({ label: p.name, href: `/products/${p.slug}` })),
      });

    const seen = new Set<string>();
    const catBrands: MegaBrand[] = [];
    for (const p of ranked) {
      if (seen.has(p.brandSlug)) continue;
      seen.add(p.brandSlug);
      catBrands.push({
        name: p.brandName,
        logoUrl: brandBySlug.get(p.brandSlug)?.logoUrl ?? null,
        href: `${href}?brand=${encodeURIComponent(p.brandSlug)}`,
      });
    }

    const top = ranked.find((p) => p.stock !== "out") ?? null;
    return {
      slug: c.slug,
      name: c.name,
      icon: c.icon,
      href,
      count: items.length,
      groups,
      brands: catBrands.slice(0, 6),
      featured: top && {
        name: top.name,
        href: `/products/${top.slug}`,
        price: top.price,
        oldPrice: top.oldPrice,
        image: top.image ?? null,
        icon: top.icon,
      },
    };
  });
}
