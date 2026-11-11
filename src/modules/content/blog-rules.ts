/** قواعد بلاگ و صفحه‌ی فرود (FR-SEO-04، FR-SEO-05، D-053) — منطق خالص */
import { toLatinDigits } from "@/lib/format";

/** بخش‌های ثابت بلاگ؛ نام نمایشی در fa.blog.sections */
export const POST_SECTIONS = ["guide", "care", "news"] as const;
export type PostSection = (typeof POST_SECTIONS)[number];
export const isPostSection = (s: string): s is PostSection =>
  (POST_SECTIONS as readonly string[]).includes(s);

export const POSTS_PER_PAGE = 12;
export const MAX_TAGS = 8;
export const MAX_LINKED_PRODUCTS = 12;

/** برچسب‌ها با ویرگول فارسی یا لاتین؛ تکراری‌ها و خالی‌ها حذف، حداکثر ۸ و هر کدام ۳۰ نویسه */
export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  for (const raw of input.split(/[,،\n]/)) {
    const t = raw.trim().replace(/\s+/g, " ").slice(0, 30);
    if (t && !seen.has(t)) seen.add(t);
    if (seen.size >= MAX_TAGS) break;
  }
  return [...seen];
}

/** شناسه‌های محصول از فرم (به ترتیب انتخاب، بدون تکرار) */
export function parseIds(values: string[], max = MAX_LINKED_PRODUCTS): string[] {
  return [...new Set(values.map((v) => v.trim()).filter((v) => /^[a-z0-9]{8,40}$/i.test(v)))].slice(
    0,
    max,
  );
}

/** زمان تقریبی خواندن: ۲۰۰ کلمه در دقیقه، حداقل ۱ */
export function readingMinutes(body: string): number {
  const words = body
    .replace(/[#*\-•]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** صفحه‌ی فرود در این لحظه قابل نمایش است؟ */
export function landingIsLive(
  l: { isActive: boolean; startsAt: Date | null; endsAt: Date | null },
  now = new Date(),
): boolean {
  return l.isActive && (!l.startsAt || l.startsAt <= now) && (!l.endsAt || l.endsAt >= now);
}

/** شماره‌ی صفحه از نشانی؛ نامعتبر = ۱ */
export function pageParam(v: string | undefined): number {
  const n = Number(toLatinDigits(v ?? ""));
  return Number.isSafeInteger(n) && n >= 1 && n <= 1000 ? n : 1;
}
