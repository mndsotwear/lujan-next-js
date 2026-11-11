/** بلاگ و صفحه‌ی فرود — فقط سرور */
import { db } from "@/lib/db";
import { landingIsLive, POSTS_PER_PAGE, type PostSection } from "./blog-rules";

/** منتشرشده و تاریخ انتشارش رسیده (انتشار زمان‌بندی‌شده) */
const published = () => ({ status: "PUBLISHED" as const, publishedAt: { lte: new Date() } });

export async function listPublishedPosts(opts: {
  section?: PostSection;
  tag?: string;
  page: number;
}) {
  const where = {
    ...published(),
    ...(opts.section ? { section: opts.section } : {}),
    ...(opts.tag ? { tags: { has: opts.tag } } : {}),
  };
  const [rows, total] = await Promise.all([
    db.post.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (opts.page - 1) * POSTS_PER_PAGE,
      take: POSTS_PER_PAGE,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        section: true,
        coverImage: true,
        coverAlt: true,
        publishedAt: true,
        body: true,
      },
    }),
    db.post.count({ where }),
  ]);
  return { rows, total, pages: Math.max(1, Math.ceil(total / POSTS_PER_PAGE)) };
}

/** مقاله‌ی منتشرشده؛ پیش‌نویس فقط با preview برای کارکنان (بررسی در صفحه) */
export async function getPost(slug: string, includeDraft = false) {
  const p = await db.post.findUnique({ where: { slug } });
  if (!p) return null;
  const live = p.status === "PUBLISHED" && !!p.publishedAt && p.publishedAt <= new Date();
  return live || includeDraft ? { ...p, live } : null;
}

export const morePosts = (section: string, exceptId: string, take = 3) =>
  db.post.findMany({
    where: { ...published(), section, id: { not: exceptId } },
    orderBy: { publishedAt: "desc" },
    take,
    select: {
      slug: true,
      title: true,
      excerpt: true,
      coverImage: true,
      coverAlt: true,
      publishedAt: true,
    },
  });

export const listPostsAdmin = () =>
  db.post.findMany({
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      section: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
    },
  });

export const getPostAdmin = (id: string) => db.post.findUnique({ where: { id } });

export async function getLiveLanding(slug: string) {
  const l = await db.landing.findUnique({ where: { slug } });
  return l && landingIsLive(l) ? l : null;
}

export const listLandingsAdmin = () => db.landing.findMany({ orderBy: { updatedAt: "desc" } });
export const getLandingAdmin = (id: string) => db.landing.findUnique({ where: { id } });

/** برای نقشه‌ی سایت */
export async function sitemapContent() {
  const [posts, landings] = await Promise.all([
    db.post.findMany({
      where: published(),
      select: { slug: true, updatedAt: true },
    }),
    db.landing.findMany({ where: { isActive: true } }),
  ]);
  return { posts, landings: landings.filter((l) => landingIsLive(l)) };
}
