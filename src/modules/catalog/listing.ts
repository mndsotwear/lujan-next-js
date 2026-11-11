/**
 * منطق فهرست دسته: فیلتر (FR-CAT-02)، مرتب‌سازی و صفحه‌بندی (FR-CAT-01).
 * ورودی/خروجی ساده است تا بدون پایگاه داده تست شود. وضعیت فیلترها در URL ذخیره می‌شود.
 * در M1.4 جستجو به Meilisearch می‌رود؛ این منطق برای فهرست دسته می‌ماند.
 */
import type { SpecSchema } from "./specs";
import type { ProductSummary } from "./types";

export const SORT_KEYS = ["bestselling", "newest", "cheapest", "expensive", "popular"] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export const PAGE_SIZE = 12;

export type ListingParams = {
  sort: SortKey;
  page: number;
  brands: string[];
  inStock: boolean;
  minPrice: number | null;
  maxPrice: number | null;
  /** فیلترهای مشخصات: کلید → مقادیر انتخاب‌شده (برای بله/خیر: ["1"]) */
  specs: Record<string, string[]>;
};

export type FacetOption = { value: string; label: string; count: number; selected: boolean };
export type Facet = {
  key: string;
  label: string;
  type: "enum" | "boolean";
  options: FacetOption[];
};

export type ListingResult = {
  items: ProductSummary[];
  total: number;
  page: number;
  pages: number;
  facets: Facet[];
  priceBounds: { min: number; max: number };
};

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const list = (v: string | string[] | undefined) =>
  (first(v) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
/** فقط عدد صحیح مثبت با ارقام لاتین پذیرفته می‌شود؛ «-3» یا «3abc» نامعتبر است. */
const toInt = (v: string | undefined) => {
  if (!v || !/^\d+$/.test(v)) return null;
  const n = Number(v);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

/** فقط کلیدهایی پذیرفته می‌شوند که در شِمای دسته «قابل فیلتر» هستند. */
export function parseListingParams(raw: RawParams, schema: SpecSchema): ListingParams {
  const sortRaw = first(raw.sort);
  const sort = (SORT_KEYS as readonly string[]).includes(sortRaw ?? "")
    ? (sortRaw as SortKey)
    : "bestselling";
  const page = Math.max(1, toInt(first(raw.page)) ?? 1);
  const specs: Record<string, string[]> = {};
  for (const f of schema) {
    if (!f.filterable || (f.type !== "enum" && f.type !== "boolean")) continue;
    const vals = list(raw[f.key]);
    const allowed =
      f.type === "enum"
        ? vals.filter((v) => f.options.some((o) => o.value === v))
        : vals.filter((v) => v === "1");
    if (allowed.length) specs[f.key] = allowed;
  }
  return {
    sort,
    page,
    brands: list(raw.brand),
    inStock: first(raw.instock) === "1",
    minPrice: toInt(first(raw.min)),
    maxPrice: toInt(first(raw.max)),
    specs,
  };
}

/** پارامترها را به query string برمی‌گرداند؛ پیش‌فرض‌ها حذف می‌شوند تا آدرس تمیز بماند. */
export function toQueryString(p: ListingParams): string {
  const q = new URLSearchParams();
  if (p.sort !== "bestselling") q.set("sort", p.sort);
  if (p.brands.length) q.set("brand", p.brands.join(","));
  if (p.inStock) q.set("instock", "1");
  if (p.minPrice) q.set("min", String(p.minPrice));
  if (p.maxPrice) q.set("max", String(p.maxPrice));
  for (const [k, v] of Object.entries(p.specs)) if (v.length) q.set(k, v.join(","));
  if (p.page > 1) q.set("page", String(p.page));
  const s = q.toString();
  return s ? `?${s}` : "";
}

type Exclude = "brand" | string | null;

function matches(
  p: ProductSummary,
  params: ListingParams,
  schema: SpecSchema,
  exclude: Exclude,
): boolean {
  if (params.inStock && p.stock === "out") return false;
  if (params.minPrice !== null && p.price < params.minPrice) return false;
  if (params.maxPrice !== null && p.price > params.maxPrice) return false;
  if (exclude !== "brand" && params.brands.length && !params.brands.includes(p.brandSlug))
    return false;
  for (const [key, values] of Object.entries(params.specs)) {
    if (key === exclude) continue;
    const field = schema.find((f) => f.key === key);
    const v = p.specs[key];
    if (field?.type === "boolean") {
      if (v !== true) return false;
    } else if (typeof v !== "string" || !values.includes(v)) return false;
  }
  return true;
}

const comparators: Record<SortKey, (a: ProductSummary, b: ProductSummary) => number> = {
  bestselling: (a, b) => b.soldCount - a.soldCount,
  newest: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  cheapest: (a, b) => a.price - b.price,
  expensive: (a, b) => b.price - a.price,
  popular: (a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount,
};

export function applyListing(
  products: ProductSummary[],
  schema: SpecSchema,
  params: ListingParams,
  brandNames: Record<string, string>,
): ListingResult {
  const filtered = products.filter((p) => matches(p, params, schema, null));
  // ناموجودها همیشه آخر فهرست می‌آیند
  const sorted = [...filtered].sort(
    (a, b) =>
      Number(a.stock === "out") - Number(b.stock === "out") || comparators[params.sort](a, b),
  );
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(params.page, pages);
  const items = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // شمارش هر گزینه با همه‌ی فیلترها به‌جز فیلتر همان گروه (تا گزینه‌های دیگر گروه دیده شوند)
  const facets: Facet[] = [];
  const brandPool = products.filter((p) => matches(p, params, schema, "brand"));
  const brandSlugs = [...new Set(products.map((p) => p.brandSlug))];
  facets.push({
    key: "brand",
    label: "برند",
    type: "enum",
    options: brandSlugs
      .map((slug) => ({
        value: slug,
        label: brandNames[slug] ?? slug,
        count: brandPool.filter((p) => p.brandSlug === slug).length,
        selected: params.brands.includes(slug),
      }))
      .sort((a, b) => b.count - a.count),
  });
  for (const f of schema) {
    if (!f.filterable) continue;
    const pool = products.filter((p) => matches(p, params, schema, f.key));
    if (f.type === "enum") {
      const options = f.options
        .map((o) => ({
          value: o.value,
          label: o.label,
          count: pool.filter((p) => p.specs[f.key] === o.value).length,
          selected: params.specs[f.key]?.includes(o.value) ?? false,
        }))
        .filter((o) => o.count > 0 || o.selected);
      if (options.length) facets.push({ key: f.key, label: f.label, type: "enum", options });
    } else if (f.type === "boolean") {
      const count = pool.filter((p) => p.specs[f.key] === true).length;
      const selected = params.specs[f.key]?.includes("1") ?? false;
      if (count || selected)
        facets.push({
          key: f.key,
          label: f.label,
          type: "boolean",
          options: [{ value: "1", label: f.label, count, selected }],
        });
    }
  }
  const prices = products.map((p) => p.price);
  return {
    items,
    total: sorted.length,
    page,
    pages,
    facets,
    priceBounds: {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
    },
  };
}
