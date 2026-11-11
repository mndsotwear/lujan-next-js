/**
 * جستجوی محصول (FR-SRCH-01..03, 05). اگر Meilisearch تنظیم و در دسترس باشد از آن، وگرنه از موتور داخلی.
 * شاخص داخلی ۶۰ ثانیه در حافظه می‌ماند تا هر کلید پیشنهاد خودکار سریع (زیر ۲۰۰ میلی‌ثانیه) پاسخ بگیرد.
 */
import { db } from "@/lib/db";
import {
  getNavCategories,
  getProductSummaries,
  getSearchDocuments,
} from "@/modules/catalog/server";
import type { ProductSummary } from "@/modules/catalog";
import { meiliEnabled, meiliSearch } from "./meili";
import { normalize } from "./normalize";
import { buildIndex, expandQuery, search } from "./rank";
import { DEFAULT_SYNONYMS } from "./synonyms";

const TTL = 60_000;
let cache: { at: number; index: ReturnType<typeof buildIndex>; groups: string[][] } | null = null;

/** پس از تغییر محصول یا مترادف در پنل، نمایه‌ی جستجو دوباره ساخته شود */
export function resetSearchCache() {
  cache = null;
}

export async function getSynonymGroups(): Promise<string[][]> {
  try {
    const rows = await db.searchSynonym.findMany({ where: { isActive: true } });
    return [...DEFAULT_SYNONYMS, ...rows.map((r) => r.terms).filter((t) => t.length > 1)];
  } catch {
    return DEFAULT_SYNONYMS; // جدول هنوز ساخته نشده
  }
}

async function localIndex() {
  if (cache && Date.now() - cache.at < TTL) return cache;
  const [docs, groups] = await Promise.all([getSearchDocuments(), getSynonymGroups()]);
  cache = { at: Date.now(), index: buildIndex(docs), groups };
  return cache;
}

async function searchIds(query: string, limit: number): Promise<string[]> {
  if (meiliEnabled()) {
    try {
      return await meiliSearch(query, limit);
    } catch (e) {
      console.warn("Meilisearch unavailable, using built-in search:", (e as Error).message);
    }
  }
  const { index, groups } = await localIndex();
  return search(index, query, groups, limit).map((r) => r.id);
}

export type Suggestions = {
  products: Pick<ProductSummary, "slug" | "name" | "brandName" | "price" | "icon" | "stock">[];
  categories: { slug: string; name: string }[];
};

/** پیشنهاد خودکار هدر (FR-SRCH-01) */
export async function suggest(query: string): Promise<Suggestions> {
  const q = normalize(query);
  if (q.length < 2) return { products: [], categories: [] };
  const [ids, cats, groups] = await Promise.all([
    searchIds(query, 6),
    getNavCategories(),
    getSynonymGroups(),
  ]);
  const products = await getProductSummaries(ids);
  // دسته‌ها: تطبیق با پرسش یا هر شکل مترادفش («نسکافه» ← «قهوه فوری»)
  const variants = expandQuery(query, groups);
  const categories = cats
    .filter((c) => {
      // کل عبارت باید با نام دسته جور باشد؛ واژه‌ی عمومی «روغن» به‌تنهایی کافی نیست
      const name = normalize(c.name);
      return variants.some((v) => name.includes(v) || v.includes(name));
    })
    .slice(0, 3);
  return {
    products: products.map(({ slug, name, brandName, price, icon, stock }) => ({
      slug,
      name,
      brandName,
      price,
      icon,
      stock,
    })),
    categories: categories.map(({ slug, name }) => ({ slug, name })),
  };
}

/** صفحه‌ی نتایج؛ هر جستجو با تعداد نتیجه ثبت می‌شود (FR-SRCH-05). */
export async function searchProducts(query: string, limit = 48): Promise<ProductSummary[]> {
  const q = normalize(query);
  if (!q) return [];
  const products = await getProductSummaries(await searchIds(query, limit));
  void logQuery(q, query, products.length);
  return products;
}

/** ثبت جستجو؛ خطا (مثلاً جدول هنوز ساخته نشده) نباید صفحه را بشکند. */
async function logQuery(q: string, raw: string, count: number) {
  try {
    await db.searchQueryLog.create({
      data: { query: q, rawQuery: raw.slice(0, 200), resultCount: count },
    });
  } catch (e) {
    console.warn("search log skipped:", (e as Error).message);
  }
}

/** برای اسکریپت همگام‌سازی Meilisearch */
export async function getSearchSyncData() {
  return { docs: await getSearchDocuments(), groups: await getSynonymGroups() };
}
