/** قواعد بنر و صفحه‌های ثابت (D-036، D-048) — منطق خالص */
export const PAGE_SLUGS = ["about", "contact", "terms"] as const;
export type PageSlug = (typeof PAGE_SLUGS)[number];

/** بنرهای قابل نمایش در این لحظه، به ترتیب */
export function activeBanners<
  T extends { isActive: boolean; startsAt: Date | null; endsAt: Date | null; sortOrder: number },
>(rows: T[], now = new Date()): T[] {
  return rows
    .filter(
      (b) => b.isActive && (!b.startsAt || b.startsAt <= now) && (!b.endsAt || b.endsAt >= now),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** فقط نشانی داخلی (/…) یا https؛ جلوی javascript: و مانند آن */
export function safeLink(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (/^\/(?!\/)[\w\-/?=&#%.~]*$/.test(s)) return s;
  try {
    const u = new URL(s);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}
