/**
 * موتور جستجوی داخلی (بدون سرویس بیرونی): تطبیق دقیق/پیشوندی/با غلط املایی + مترادف.
 * وقتی MEILI_URL تنظیم نشده یا Meilisearch در دسترس نیست از همین استفاده می‌شود (ریسک «کیفیت جستجوی فارسی»، بخش ۱۶).
 */
import { allowedTypos, editDistance } from "./fuzzy";
import { compact, normalize, tokenize } from "./normalize";

export type SearchDoc = {
  id: string;
  /** فیلدها به ترتیب اهمیت: نام، برند، دسته، توضیح کوتاه و مشخصات */
  name: string;
  brand: string;
  category: string;
  extra: string;
  popularity: number; // برای مرتب‌سازی نتایج هم‌امتیاز
  inStock: boolean;
};

type Indexed = SearchDoc & { fields: { tokens: string[]; compact: string; weight: number }[] };

const WEIGHTS = { name: 10, brand: 6, category: 5, extra: 2 };

export function buildIndex(docs: SearchDoc[]): Indexed[] {
  return docs.map((d) => ({
    ...d,
    fields: (["name", "brand", "category", "extra"] as const).map((k) => ({
      tokens: tokenize(d[k]),
      compact: compact(d[k]),
      weight: WEIGHTS[k],
    })),
  }));
}

/** گروه‌های مترادف را روی پرسش اعمال می‌کند: هر عبارت پرسش که در یک گروه باشد، با همه‌ی اعضای گروه جایگزین‌پذیر است. */
export function expandQuery(query: string, groups: string[][]): string[] {
  const q = normalize(query);
  const variants = new Set([q]);
  for (const g of groups) {
    const norm = g.map(normalize);
    for (const term of norm) {
      if (term && (` ${q} `.includes(` ${term} `) || q === term)) {
        for (const alt of norm)
          if (alt !== term) variants.add(normalize(` ${q} `.replace(` ${term} `, ` ${alt} `)));
      }
    }
  }
  return [...variants];
}

function tokenScore(
  qt: string,
  field: { tokens: string[]; compact: string; weight: number },
  isLast: boolean,
): number {
  let best = 0;
  for (const t of field.tokens) {
    if (t === qt) return field.weight * 3;
    // پیشوند فقط برای واژه‌ی آخر (کاربر هنوز در حال تایپ است)
    if (isLast && qt.length >= 2 && t.startsWith(qt)) best = Math.max(best, field.weight * 2);
    const max = allowedTypos(qt.length);
    if (max > 0) {
      const target = isLast && t.length > qt.length ? t.slice(0, qt.length) : t;
      if (editDistance(qt, target, max) <= max) best = Math.max(best, field.weight);
    }
  }
  if (!best && qt.length >= 3 && field.compact.includes(qt)) best = field.weight; // «ریشتراش» در «ریش تراش»
  return best;
}

/** پاداش ارتباط: پرسش با دسته‌ی کالا یا ابتدای نامش جور است («کلیپر» ← خود ماشین‌ها، نه روغنِ ماشین) */
function relevanceBonus(doc: Indexed, phrase: string, qTokens: string[]): number {
  const [name, , category] = doc.fields;
  let bonus = 0;
  if (category && qTokens.every((t) => category.tokens.some((c) => c === t || c.startsWith(t))))
    bonus += 15;
  if (name && name.tokens.join(" ").startsWith(phrase)) bonus += 10;
  return bonus;
}

function scoreDoc(doc: Indexed, qTokens: string[], qCompact: string): number {
  let total = 0;
  for (const [i, qt] of qTokens.entries()) {
    const s = Math.max(...doc.fields.map((f) => tokenScore(qt, f, i === qTokens.length - 1)));
    if (!s) {
      // پرسش چسبیده («ماشیناصلاح») را با شکل فشرده‌ی فیلدها می‌سنجیم
      if (
        qTokens.length === 1 &&
        qCompact.length >= 4 &&
        doc.fields.some((f) => f.compact.includes(qCompact))
      )
        return 8;
      return 0; // همه‌ی واژه‌ها باید پیدا شوند
    }
    total += s;
  }
  return total + relevanceBonus(doc, qTokens.join(" "), qTokens);
}

export function search(
  index: Indexed[],
  query: string,
  groups: string[][],
  limit = 20,
): { id: string; score: number }[] {
  const variants = expandQuery(query, groups);
  const scores = new Map<string, number>();
  for (const v of variants) {
    const qTokens = v.split(" ").filter(Boolean);
    if (!qTokens.length) continue;
    const qCompact = v.replace(/\s/g, "");
    for (const doc of index) {
      const s = scoreDoc(doc, qTokens, qCompact);
      if (s > (scores.get(doc.id) ?? 0)) scores.set(doc.id, s);
    }
  }
  const byId = new Map(index.map((d) => [d.id, d]));
  return [...scores.entries()]
    .map(([id, score]) => ({ id, score, d: byId.get(id)! }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.d.inStock) - Number(a.d.inStock) ||
        b.d.popularity - a.d.popularity,
    )
    .slice(0, limit)
    .map(({ id, score }) => ({ id, score }));
}
