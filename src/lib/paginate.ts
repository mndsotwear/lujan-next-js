/** صفحه‌بندی ساده‌ی فهرست‌های پنل (NFR-PERF-05) — منطق خالص */
import { toLatinDigits } from "./format";

export const ADMIN_PAGE_SIZE = 50;

export function pageOf(raw: string | undefined): number {
  const n = Number(toLatinDigits(raw ?? ""));
  return Number.isSafeInteger(n) && n >= 1 ? n : 1;
}

export function paginate<T>(rows: T[], page: number, size = ADMIN_PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(Math.max(1, page), pages);
  return { items: rows.slice((p - 1) * size, p * size), page: p, pages, total: rows.length };
}
