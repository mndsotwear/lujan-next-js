/**
 * محدودیت تلاش در حافظه‌ی سرور (برای یک نمونه‌ی سرور کافی است؛ در چند نمونه به Redis منتقل شود — M1.10).
 */
const buckets = new Map<string, number[]>();

export function hit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 10_000) for (const k of buckets.keys()) if (k !== key) buckets.delete(k);
  return true;
}
