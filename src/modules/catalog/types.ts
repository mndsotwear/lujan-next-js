import type { SpecSchema, SpecValues } from "./specs";
import type { StockState } from "./stock";

/** خلاصه‌ی محصول برای کارت و فهرست — بدون وابستگی به Prisma تا منطق فهرست قابل تست باشد. */
export type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  icon: string;
  /** تصویر اصلی؛ بدون تصویر، آیکون دسته نمایش داده می‌شود */
  image?: { url: string; alt: string } | null;
  brandName: string;
  brandSlug: string;
  categorySlug: string;
  tags: string[];
  ratingAvg: number;
  ratingCount: number;
  soldCount: number;
  createdAt: Date;
  specs: SpecValues;
  /** طعم‌ها برای طعم‌یاب */
  flavors: string[];
  /** کمترین قیمت مؤثر (تخفیفی اگر باشد) بین تنوع‌های فعال — تومان */
  price: number;
  /** قیمت پیش از تخفیف همان تنوع؛ اگر تخفیف ندارد null */
  oldPrice: number | null;
  stock: StockState;
  /** مجموع قابل‌فروش همه‌ی تنوع‌ها */
  available: number;
  /** تنوعی که دکمه‌ی «افزودن» کارت به سبد می‌برد (ارزان‌ترین موجود) */
  defaultVariantId: string | null;
  variantCount: number;
};

export type CategoryInfo = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  imageUrl?: string | null;
  specSchema: SpecSchema;
};
