/** استوری‌ها — فقط سرور */
import { db } from "@/lib/db";
import { activeStories } from "./rules";

const withSlides = {
  slides: { orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }] },
};

export const listStoriesAdmin = () =>
  db.story.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: withSlides,
  });

export type PublicStory = {
  id: string;
  title: string;
  cover: string;
  updatedAt: string;
  slides: {
    id: string;
    kind: "image" | "video";
    url: string;
    ctaLabel: string | null;
    ctaLink: string | null;
  }[];
};

/** برای صفحه‌ی اصلی؛ اگر جدول هنوز ساخته نشده، بدون استوری */
export async function getActiveStories(): Promise<PublicStory[]> {
  try {
    const rows = await db.story.findMany({ where: { isActive: true }, include: withSlides });
    return activeStories(rows).map((s) => ({
      id: s.id,
      title: s.title,
      cover: s.cover,
      updatedAt: s.updatedAt.toISOString(),
      slides: s.slides.map((x) => ({
        id: x.id,
        kind: x.kind === "video" ? "video" : "image",
        url: x.url,
        ctaLabel: x.ctaLabel,
        ctaLink: x.ctaLink,
      })),
    }));
  } catch {
    return [];
  }
}
