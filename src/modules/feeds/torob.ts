/**
 * خروجی محصولات برای ترب و ایمالز — منطق خالص.
 * قالب ترب بر اساس «وب‌سرویس ترب (نسخه‌ی ۳)»؛ پیش از ثبت در پنل فروشندگان ترب با مستندات فعلی‌شان تطبیق داده شود.
 */
export const FEED_PAGE_SIZE = 100;

export type FeedProduct = {
  id: string;
  slug: string;
  name: string;
  categoryName: string;
  brandName: string;
  summary: string | null;
  price: number;
  oldPrice: number | null;
  inStock: boolean;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
};

const abs = (site: string, url: string) => (url.startsWith("http") ? url : `${site}${url}`);
export const productUrl = (site: string, slug: string) =>
  `${site}/products/${encodeURIComponent(slug)}`;

export function torobItem(p: FeedProduct, site: string) {
  return {
    page_unique: p.id,
    page_url: productUrl(site, p.slug),
    title: p.name,
    subtitle: p.brandName,
    current_price: p.inStock ? p.price : 0,
    old_price: p.inStock && p.oldPrice ? p.oldPrice : 0,
    availability: p.inStock ? "instock" : "outofstock",
    category_name: p.categoryName,
    image_links: p.images.map((u) => abs(site, u)),
    image_link: p.images[0] ? abs(site, p.images[0]) : "",
    short_desc: p.summary ?? "",
    date_added: p.createdAt.toISOString(),
    date_updated: p.updatedAt.toISOString(),
  };
}

export function emallsItem(p: FeedProduct, site: string) {
  return {
    id: p.id,
    title: p.name,
    url: productUrl(site, p.slug),
    price: p.inStock ? p.price : 0,
    old_price: p.inStock && p.oldPrice ? p.oldPrice : 0,
    is_available: p.inStock,
    category: p.categoryName,
    image: p.images[0] ? abs(site, p.images[0]) : "",
  };
}

/** صفحه‌بندی: page از ۱ */
export function paginate<T>(items: T[], pageRaw: unknown) {
  const max = Math.max(1, Math.ceil(items.length / FEED_PAGE_SIZE));
  const n = Math.trunc(Number(pageRaw));
  const page = Number.isFinite(n) && n >= 1 ? Math.min(n, max) : 1;
  return {
    page,
    maxPages: max,
    total: items.length,
    items: items.slice((page - 1) * FEED_PAGE_SIZE, page * FEED_PAGE_SIZE),
  };
}
