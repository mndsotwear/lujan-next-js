"use server";
/** مدیریت استوری‌های صفحه‌ی اصلی در پنل (دسترسی «محتوا») */
import { revalidatePath } from "next/cache";
import { fa } from "@/content/fa";
import { db } from "@/lib/db";
import { toLatinDigits } from "@/lib/format";
import { parseJalali } from "@/lib/jalali";
import { audit, staffWith } from "@/modules/admin/server";
import { safeLink } from "@/modules/content/rules";
import { removeStoryMedia, saveStoryMedia } from "./media";
import { kindOf, sniffStoryMedia, STORY_IMAGE_MAX, STORY_VIDEO_MAX } from "./rules";

export type StoryState = { ok: boolean; message: string; values?: Record<string, string> } | null;
const t = () => fa.admin.content.stories;

const refresh = () => {
  revalidatePath("/");
  revalidatePath("/admin/content");
};

/** فایل فرم: عکس (و اگر اجازه باشد ویدیو) با بررسی محتوا و حجم */
async function readMedia(
  form: FormData,
  key: string,
  allowVideo: boolean,
): Promise<{ url?: string; kind?: "image" | "video"; error?: string }> {
  const f = form.get(key);
  if (!f || typeof f !== "object" || !("arrayBuffer" in f) || f.size === 0) return {};
  const bytes = new Uint8Array(await f.arrayBuffer());
  const ext = sniffStoryMedia(bytes.subarray(0, 16));
  if (!ext || (!allowVideo && ext === "mp4"))
    return { error: allowVideo ? t().errors.mediaType : t().errors.imageType };
  const kind = kindOf(ext);
  if (f.size > (kind === "video" ? STORY_VIDEO_MAX : STORY_IMAGE_MAX))
    return { error: kind === "video" ? t().errors.videoSize : t().errors.imageSize };
  return { url: await saveStoryMedia(bytes, ext), kind };
}

const formValues = (form: FormData) =>
  Object.fromEntries(
    [...form.entries()].filter(([, v]) => typeof v === "string").map(([k, v]) => [k, String(v)]),
  );

export async function saveStory(_prev: StoryState, form: FormData): Promise<StoryState> {
  const me = await staffWith("content.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const values = formValues(form);
  const id = values.id || null;
  const old = id ? await db.story.findUnique({ where: { id } }) : null;
  if (id && !old) return { ok: false, message: t().errors.notFound, values };
  const title = (values.title ?? "").trim().slice(0, 40);
  if (title.length < 2) return { ok: false, message: t().errors.title, values };
  const startsAt = values.startsAt?.trim() ? parseJalali(values.startsAt) : null;
  const endsAt = values.endsAt?.trim() ? parseJalali(values.endsAt, true) : null;
  if ((values.startsAt?.trim() && !startsAt) || (values.endsAt?.trim() && !endsAt))
    return { ok: false, message: fa.admin.marketing.coupons.errors.dateFormat, values };
  const cover = await readMedia(form, "cover", false);
  if (cover.error) return { ok: false, message: cover.error, values };
  if (!old && !cover.url) return { ok: false, message: t().errors.cover, values };
  const data = {
    title,
    startsAt,
    endsAt,
    isActive: values.isActive === "on",
    sortOrder: Number(toLatinDigits(values.sortOrder ?? "")) || 0,
    ...(cover.url ? { cover: cover.url } : {}),
  };
  const s = old
    ? await db.story.update({ where: { id: old.id }, data })
    : await db.story.create({ data: { ...data, cover: cover.url! } });
  if (old && cover.url) await removeStoryMedia(old.cover);
  await audit(me.id, old ? "story.update" : "story.create", "story", s.id, { title });
  refresh();
  return { ok: true, message: t().saved, values: old ? values : undefined };
}

export async function deleteStory(id: string): Promise<{ ok: boolean; message: string }> {
  const me = await staffWith("content.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const s = await db.story.findUnique({ where: { id }, include: { slides: true } });
  if (!s) return { ok: false, message: t().errors.notFound };
  await db.story.delete({ where: { id } });
  await removeStoryMedia(s.cover);
  for (const x of s.slides) await removeStoryMedia(x.url);
  await audit(me.id, "story.delete", "story", id, { title: s.title });
  refresh();
  return { ok: true, message: t().saved };
}

export async function addStorySlide(_prev: StoryState, form: FormData): Promise<StoryState> {
  const me = await staffWith("content.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const values = formValues(form);
  const story = await db.story.findUnique({
    where: { id: values.storyId ?? "" },
    include: { _count: { select: { slides: true } } },
  });
  if (!story) return { ok: false, message: t().errors.notFound, values };
  if (story._count.slides >= 15) return { ok: false, message: t().errors.tooMany, values };
  const ctaLabel = (values.ctaLabel ?? "").trim().slice(0, 30) || null;
  const linkRaw = (values.ctaLink ?? "").trim();
  const ctaLink = linkRaw ? safeLink(linkRaw) : null;
  if (linkRaw && !ctaLink) return { ok: false, message: t().errors.link, values };
  if (ctaLabel && !ctaLink) return { ok: false, message: t().errors.linkNeeded, values };
  const media = await readMedia(form, "file", true);
  if (media.error) return { ok: false, message: media.error, values };
  if (!media.url) return { ok: false, message: t().errors.file, values };
  await db.storySlide.create({
    data: {
      storyId: story.id,
      kind: media.kind!,
      url: media.url,
      ctaLabel: ctaLink ? (ctaLabel ?? t().defaultCta) : null,
      ctaLink,
      sortOrder: story._count.slides,
    },
  });
  // تغییر زمان به‌روزرسانی تا حلقه‌ی «دیده‌شده» برای مشتری‌ها دوباره رنگی شود
  await db.story.update({ where: { id: story.id }, data: { updatedAt: new Date() } });
  await audit(me.id, "story.slide.add", "story", story.id, { kind: media.kind });
  refresh();
  return { ok: true, message: t().saved };
}

export async function deleteStorySlide(id: string): Promise<{ ok: boolean; message: string }> {
  const me = await staffWith("content.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const x = await db.storySlide.findUnique({ where: { id } });
  if (!x) return { ok: false, message: t().errors.notFound };
  await db.storySlide.delete({ where: { id } });
  await removeStoryMedia(x.url);
  await audit(me.id, "story.slide.delete", "story", x.storyId, {});
  refresh();
  return { ok: true, message: t().saved };
}

/** جابه‌جایی اسلاید با قبلی/بعدی */
export async function moveStorySlide(
  id: string,
  dir: -1 | 1,
): Promise<{ ok: boolean; message: string }> {
  const me = await staffWith("content.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const x = await db.storySlide.findUnique({ where: { id } });
  if (!x) return { ok: false, message: t().errors.notFound };
  const all = await db.storySlide.findMany({
    where: { storyId: x.storyId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const i = all.findIndex((s) => s.id === id);
  const j = i + dir;
  if (j < 0 || j >= all.length) return { ok: true, message: t().saved };
  [all[i], all[j]] = [all[j]!, all[i]!];
  await db.$transaction(
    all.map((s, k) => db.storySlide.update({ where: { id: s.id }, data: { sortOrder: k } })),
  );
  refresh();
  return { ok: true, message: t().saved };
}
