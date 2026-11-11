/**
 * اتصال به Meilisearch (D-002) با fetch ساده — بدون بسته‌ی اضافه.
 * فقط وقتی MEILI_URL تنظیم شده باشد استفاده می‌شود؛ در غیر این صورت موتور داخلی (rank.ts) کار می‌کند.
 */
import type { SearchDoc } from "./rank";

const INDEX = "products";

function config() {
  const url = process.env.MEILI_URL;
  if (!url) return null;
  return { url: url.replace(/\/$/, ""), key: process.env.MEILI_MASTER_KEY ?? "" };
}

async function call<T>(path: string, init: RequestInit = {}, timeoutMs = 1500): Promise<T> {
  const c = config();
  if (!c) throw new Error("MEILI_URL not set");
  const res = await fetch(`${c.url}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(c.key ? { Authorization: `Bearer ${c.key}` } : {}),
      ...init.headers,
    },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Meilisearch ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export const meiliEnabled = () => !!config();

export async function meiliSearch(query: string, limit: number): Promise<string[]> {
  const r = await call<{ hits: { id: string }[] }>(`/indexes/${INDEX}/search`, {
    method: "POST",
    body: JSON.stringify({ q: query, limit, attributesToRetrieve: ["id"] }),
  });
  return r.hits.map((h) => h.id);
}

/** بارگذاری کامل اسناد و تنظیمات (اجرا: npm run search:sync). */
export async function meiliSync(docs: SearchDoc[], synonymGroups: string[][]) {
  const synonyms: Record<string, string[]> = {};
  for (const g of synonymGroups) for (const t of g) synonyms[t] = g.filter((x) => x !== t);
  await call(
    `/indexes/${INDEX}/settings`,
    {
      method: "PATCH",
      body: JSON.stringify({
        searchableAttributes: ["name", "brand", "category", "extra"],
        rankingRules: [
          "words",
          "typo",
          "proximity",
          "attribute",
          "exactness",
          "inStock:desc",
          "popularity:desc",
        ],
        sortableAttributes: ["popularity"],
        synonyms,
        typoTolerance: { minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 } },
      }),
    },
    10000,
  );
  await call(
    `/indexes/${INDEX}/documents?primaryKey=id`,
    {
      method: "PUT",
      body: JSON.stringify(docs.map((d) => ({ ...d, inStock: d.inStock ? 1 : 0 }))),
    },
    30000,
  );
}
