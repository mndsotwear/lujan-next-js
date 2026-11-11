import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PostCard } from "@/components/content/PostCard";
import { fa } from "@/content/fa";
import { isPostSection, pageParam, POST_SECTIONS } from "@/modules/content";
import { listPublishedPosts } from "@/modules/content/server";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ section?: string; tag?: string; page?: string }> };

const href = (q: { section?: string; tag?: string; page?: number }) => {
  const s = new URLSearchParams();
  if (q.section) s.set("section", q.section);
  if (q.tag) s.set("tag", q.tag);
  if (q.page && q.page > 1) s.set("page", String(q.page));
  const str = s.toString();
  return str ? `/blog?${str}` : "/blog";
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const section = sp.section && isPostSection(sp.section) ? sp.section : undefined;
  const page = pageParam(sp.page);
  const title = section ? `${fa.blog.sections[section]} — ${fa.blog.title}` : fa.blog.title;
  return {
    title,
    description: fa.blog.intro,
    alternates: { canonical: href({ section, page }) },
    // صفحه‌های برچسب تکراری‌اند؛ پیوندها دنبال شوند ولی خودشان نمایه نشوند
    ...(sp.tag ? { robots: { index: false, follow: true } } : {}),
    openGraph: { type: "website", url: href({ section, page }), title, description: fa.blog.intro },
  };
}

export default async function BlogPage({ searchParams }: Props) {
  const sp = await searchParams;
  const section = sp.section && isPostSection(sp.section) ? sp.section : undefined;
  const tag = sp.tag?.trim().slice(0, 30) || undefined;
  const page = pageParam(sp.page);
  const { rows, pages } = await listPublishedPosts({ section, tag, page });
  const t = fa.blog;
  const tab = (key: string | undefined, label: string) => (
    <Link
      key={key ?? "all"}
      href={href({ section: key })}
      aria-current={section === key ? "page" : undefined}
      className={`rounded-chip border px-3 py-1.5 text-sm ${section === key ? "border-ink bg-ink text-bg" : "border-line text-ink-2 hover:border-ink"}`}
    >
      {label}
    </Link>
  );
  return (
    <main className="mx-auto max-w-[1240px] px-4">
      <Breadcrumbs path="/blog" items={[{ label: fa.nav.home, href: "/" }, { label: t.title }]} />
      <h1 className="text-3xl font-black">{t.title}</h1>
      <p className="text-ink-2 mt-2 max-w-[60ch]">{t.intro}</p>
      <nav aria-label={t.title} className="mt-6 flex flex-wrap gap-2">
        {tab(undefined, t.all)}
        {POST_SECTIONS.map((s) => tab(s, t.sections[s]!))}
      </nav>
      {tag && (
        <p className="mt-4 text-sm">
          {t.tagged(tag)} —{" "}
          <Link href={href({ section })} className="text-copper underline">
            {t.clearTag}
          </Link>
        </p>
      )}
      {rows.length === 0 ? (
        <p className="text-steel mt-10">{t.empty}</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => (
            <PostCard key={p.id} p={p} />
          ))}
        </div>
      )}
      {pages > 1 && (
        <nav
          aria-label={t.page(page, pages)}
          className="mt-10 flex items-center justify-center gap-4 text-sm"
        >
          {page > 1 && (
            <Link href={href({ section, tag, page: page - 1 })} rel="prev" className="underline">
              {t.prev}
            </Link>
          )}
          <span className="text-steel">{t.page(page, pages)}</span>
          {page < pages && (
            <Link href={href({ section, tag, page: page + 1 })} rel="next" className="underline">
              {t.next}
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
