/** نقشه‌ی سایت برای موتورهای جستجو (FR-SEO-02) — از پایگاه داده، هر ساعت تازه */
import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { sitemapContent } from "@/modules/content/server";
import { absUrl } from "@/modules/seo";

export const dynamic = "force-dynamic"; // هنگام build به پایگاه داده نیاز ندارد
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixed: MetadataRoute.Sitemap = [
    { url: absUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absUrl("/returns"), changeFrequency: "monthly", priority: 0.3 },
    { url: absUrl("/blog"), changeFrequency: "weekly", priority: 0.6 },
  ];
  try {
    const [categories, products, pages, content] = await Promise.all([
      db.category.findMany({ select: { slug: true } }),
      db.product.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      db.page.findMany({ select: { slug: true, updatedAt: true } }),
      sitemapContent(),
    ]);
    return [
      ...fixed,
      ...categories.map((c) => ({
        url: absUrl(`/categories/${c.slug}`),
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
      ...products.map((p) => ({
        url: absUrl(`/products/${p.slug}`),
        lastModified: p.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...content.posts.map((p) => ({
        url: absUrl(`/blog/${p.slug}`),
        lastModified: p.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
      ...content.landings.map((l) => ({
        url: absUrl(`/offers/${l.slug}`),
        lastModified: l.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.7,
      })),
      ...pages.map((p) => ({
        url: absUrl(`/${p.slug}`),
        lastModified: p.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.3,
      })),
    ];
  } catch (e) {
    console.error("sitemap failed", e);
    return fixed;
  }
}
