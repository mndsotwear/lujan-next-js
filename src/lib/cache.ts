/**
 * کش داده‌ی صفحه‌های فروشگاه (D-016، FR-SEO-01، NFR-PERF).
 * صفحه‌ها پویا می‌مانند (سبد و ورود از کوکی)، ولی پرس‌وجوهای سنگین کاتالوگ کش می‌شوند:
 * با هر تغییر در پنل بی‌درنگ تازه می‌شوند و در غیر این صورت حداکثر هر ۶۰ ثانیه (موجودی پس از خرید).
 */
import { revalidateTag, unstable_cache, updateTag } from "next/cache";

export const CATALOG_TAG = "catalog";
export const CATALOG_TTL = 60;

/** کش، تاریخ را رشته می‌کند؛ فیلدهای createdAt دوباره Date می‌شوند. */
export function reviveDates<T>(value: T): T {
  if (Array.isArray(value)) return value.map(reviveDates) as T;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = k === "createdAt" && typeof v === "string" ? new Date(v) : reviveDates(v);
    }
    return out as T;
  }
  return value;
}

export function cachedCatalog<A extends unknown[], R>(
  name: string,
  fn: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  const inner = unstable_cache(fn, [name], { tags: [CATALOG_TAG], revalidate: CATALOG_TTL });
  return async (...args: A) => reviveDates(await inner(...args));
}

/** بعد از هر تغییر کاتالوگ در پنل (فقط از Server Action؛ بیرون از آن به حالت پس‌زمینه برمی‌گردد) */
export function expireCatalog(): void {
  try {
    updateTag(CATALOG_TAG);
  } catch {
    try {
      revalidateTag(CATALOG_TAG, { expire: 0 });
    } catch {
      // بیرون از درخواست (مثلاً اسکریپت): کش با TTL خودش تازه می‌شود
    }
  }
}
