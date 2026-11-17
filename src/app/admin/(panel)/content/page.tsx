import type { Metadata } from "next";
import Link from "next/link";
import { BannerManager } from "@/components/admin/BannerManager";
import { PageEditor } from "@/components/admin/PageEditor";
import { StoryManager } from "@/components/admin/StoryManager";
import { activeStories } from "@/modules/stories/rules";
import { listStoriesAdmin } from "@/modules/stories/server";
import { fa } from "@/content/fa";
import { formatJalaliInput } from "@/lib/jalali";
import { requireStaff } from "@/modules/admin/server";
import { activeBanners, landingIsLive, PAGE_SLUGS } from "@/modules/content";
import {
  listBanners,
  listLandingsAdmin,
  listPages,
  listPostsAdmin,
} from "@/modules/content/server";
import { btnPrimary, card } from "@/components/admin/ui";

const TABS = ["banners", "stories", "pages", "posts", "landings"] as const;
type Tab = (typeof TABS)[number];
const faDate = (d: Date) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium" }).format(d);

export const metadata: Metadata = { title: fa.admin.content.title };

/** بنر صفحه‌ی اصلی و صفحه‌های ثابت (FR-ADM-09، D-036، D-048) */
export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireStaff("content.manage");
  const { tab: raw } = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(raw ?? "") ? (raw as Tab) : "banners";
  const t = fa.admin.content;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <nav className="border-line flex gap-1 border-b">
        {TABS.map((k) => (
          <Link
            key={k}
            href={`?tab=${k}`}
            aria-current={tab === k ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${tab === k ? "border-copper font-bold" : "text-ink-2 border-transparent"}`}
          >
            {t.tabs[k]}
          </Link>
        ))}
      </nav>
      {tab === "banners" ? (
        <Banners />
      ) : tab === "stories" ? (
        <Stories />
      ) : tab === "pages" ? (
        <Pages />
      ) : tab === "posts" ? (
        <Posts />
      ) : (
        <Landings />
      )}
    </div>
  );
}

async function Stories() {
  const rows = await listStoriesAdmin();
  const live = new Set(activeStories(rows).map((s) => s.id));
  return (
    <StoryManager
      stories={rows.map((s) => ({
        id: s.id,
        title: s.title,
        cover: s.cover,
        startsAt: formatJalaliInput(s.startsAt),
        endsAt: formatJalaliInput(s.endsAt),
        isActive: s.isActive,
        sortOrder: s.sortOrder,
        live: live.has(s.id),
        slides: s.slides.map((x) => ({
          id: x.id,
          kind: x.kind,
          url: x.url,
          ctaLabel: x.ctaLabel,
          ctaLink: x.ctaLink,
        })),
      }))}
    />
  );
}

async function Banners() {
  const rows = await listBanners();
  const live = new Set(activeBanners(rows).map((b) => b.id));
  return (
    <BannerManager
      banners={rows.map((b) => ({
        id: b.id,
        title: b.title,
        subtitle: b.subtitle ?? "",
        link: b.link ?? "",
        alt: b.alt,
        placement: b.placement,
        imageDesktop: b.imageDesktop,
        imageMobile: b.imageMobile,
        startsAt: formatJalaliInput(b.startsAt),
        endsAt: formatJalaliInput(b.endsAt),
        isActive: b.isActive,
        sortOrder: b.sortOrder,
        live: live.has(b.id),
      }))}
    />
  );
}

async function Pages() {
  const pages = new Map((await listPages()).map((p) => [p.slug, p]));
  return (
    <div className="space-y-5">
      <p className="text-ink-2 text-sm">{fa.admin.content.pages.intro}</p>
      {PAGE_SLUGS.map((slug) => (
        <PageEditor
          key={slug}
          slug={slug}
          title={pages.get(slug)?.title ?? fa.pages.titles[slug]!}
          body={pages.get(slug)?.body ?? ""}
        />
      ))}
    </div>
  );
}

async function Posts() {
  const t = fa.admin.content.posts;
  const rows = await listPostsAdmin();
  const now = new Date();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-2 max-w-[70ch] text-sm">{t.intro}</p>
        <Link href="/admin/content/posts/new" className={`${btnPrimary} inline-flex items-center`}>
          {t.new}
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="text-steel text-sm">{t.empty}</p>
      ) : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead className="text-steel text-start">
              <tr>
                <th className="p-3 text-start font-normal">{t.cols.title}</th>
                <th className="p-3 text-start font-normal">{t.cols.section}</th>
                <th className="p-3 text-start font-normal">{t.cols.status}</th>
                <th className="p-3 text-start font-normal">{t.cols.date}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const st =
                  p.status === "PUBLISHED" && p.publishedAt && p.publishedAt > now
                    ? "SCHEDULED"
                    : p.status;
                return (
                  <tr key={p.id} className="border-line border-t">
                    <td className="p-3">
                      <Link
                        href={`/admin/content/posts/${p.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {p.title}
                      </Link>
                    </td>
                    <td className="p-3">{fa.blog.sections[p.section] ?? p.section}</td>
                    <td className={`p-3 ${st === "PUBLISHED" ? "text-ok" : "text-steel"}`}>
                      {t.status[st]}
                    </td>
                    <td className="p-3">{p.publishedAt ? faDate(p.publishedAt) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

async function Landings() {
  const t = fa.admin.content.landings;
  const rows = await listLandingsAdmin();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-2 max-w-[70ch] text-sm">{t.intro}</p>
        <Link
          href="/admin/content/landings/new"
          className={`${btnPrimary} inline-flex items-center`}
        >
          {t.new}
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="text-steel text-sm">{t.empty}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((l) => (
            <li key={l.id} className={`${card} flex flex-wrap items-center gap-3 p-4 text-sm`}>
              <Link
                href={`/admin/content/landings/${l.id}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {l.title}
              </Link>
              <span dir="ltr" className="text-steel">
                /offers/{l.slug}
              </span>
              <span className={`ms-auto ${landingIsLive(l) ? "text-ok" : "text-steel"}`}>
                {landingIsLive(l) ? t.live : t.off}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
