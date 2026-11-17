/** استوری‌های صفحه‌ی اصلی — منطق خالص (قابل تست، امن برای مرورگر) */

export type StoryMediaKind = "image" | "video";
export type StoryExt = "jpg" | "png" | "webp" | "mp4";

/** حداکثر حجم: عکس ۸ مگابایت، ویدیو ۲۵ مگابایت (حدود ۳۰ ثانیه) */
export const STORY_IMAGE_MAX = 8 * 1024 * 1024;
export const STORY_VIDEO_MAX = 25 * 1024 * 1024;
/** مدت نمایش هر اسلاید عکس */
export const STORY_IMAGE_MS = 5000;
/** سقف نمایش ویدیو اگر طولانی‌تر بود */
export const STORY_VIDEO_MAX_MS = 30_000;

/** نوع فایل از روی چند بایت اول (نه پسوند) */
export function sniffStoryMedia(head: Uint8Array): StoryExt | null {
  const b = (i: number) => head[i] ?? -1;
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return "jpg";
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return "png";
  const ascii = (from: number, to: number) => String.fromCharCode(...head.slice(from, to));
  if (head.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  // MP4/MOV: «ftyp» از بایت ۴
  if (head.length >= 12 && ascii(4, 8) === "ftyp") return "mp4";
  return null;
}

export const kindOf = (ext: StoryExt): StoryMediaKind => (ext === "mp4" ? "video" : "image");

/** فقط نام‌هایی که خود سایت ساخته (تصادفی) */
export const isSafeStoryName = (name: string) => /^[a-z0-9]{16,40}\.(jpg|png|webp|mp4)$/.test(name);

/** استوری‌های فعال در بازه‌ی نمایش و دارای دست‌کم یک اسلاید، به ترتیب */
export function activeStories<
  T extends {
    isActive: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
    sortOrder: number;
    slides: unknown[];
  },
>(rows: T[], now = new Date()): T[] {
  return rows
    .filter(
      (s) =>
        s.isActive &&
        s.slides.length > 0 &&
        (!s.startsAt || s.startsAt <= now) &&
        (!s.endsAt || s.endsAt >= now),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** بازه‌ی Range درخواست ویدیو (Safari بدون آن ویدیو را پخش نمی‌کند) */
export function parseRange(
  header: string | null,
  size: number,
): { start: number; end: number } | null {
  const m = header?.match(/^bytes=(\d*)-(\d*)$/);
  if (!m || (!m[1] && !m[2])) return null;
  let start: number;
  let end: number;
  if (!m[1]) {
    const suffix = Number(m[2]);
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
  }
  if (start > end || start >= size) return null;
  return { start, end };
}
