import type { StockState } from "@/modules/catalog";

/** یک قلم سبد برای نمایش و محاسبه (بدون وابستگی به Prisma) */
export type CartLine = {
  id: string;
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  variantLabel: string | null;
  icon: string;
  unitPrice: number; // قیمت مؤثر فعلی (تخفیفی اگر باشد)
  oldUnitPrice: number | null; // قیمت پیش از تخفیف
  priceAtAdd: number;
  quantity: number;
  available: number;
  stock: StockState;
  savedForLater: boolean;
  /** برای هزینه‌ی ارسال (FR-SHP-02): وزن و حجم هر عدد */
  weightGrams: number;
  volumeCm3: number;
};

export type CouponInfo = {
  code: string;
  type: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  value: number;
  minSubtotal: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  /** هر مشتری چند بار؛ null = بدون محدودیت (D-047) */
  perCustomerLimit?: number | null;
  usedCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
};

export type CartNotice = {
  kind: "price_up" | "price_down" | "qty_reduced" | "out_of_stock" | "coupon_removed";
  name: string;
  detail?: number;
};

export type Recommendation = {
  productId: string;
  slug: string;
  name: string;
  icon: string;
  variantId: string;
  price: number;
  reason: string;
  /** با افزودن این، ارسال رایگان می‌شود (FR-REC-06) */
  unlocksFreeShipping: boolean;
};

export type CartTotals = {
  itemCount: number;
  subtotal: number; // جمع با قیمت مؤثر
  itemSavings: number; // سود از تخفیف کالاها
  couponDiscount: number;
  freeShipping: boolean;
  freeShippingGap: number; // مانده تا ارسال رایگان (۰ اگر آستانه نداریم)
  total: number; // قابل پرداخت بدون هزینه‌ی ارسال
};

export type CartView = {
  lines: CartLine[];
  saved: CartLine[];
  coupon: { code: string; error?: string } | null;
  totals: CartTotals;
  notices: CartNotice[];
  recommendations: Recommendation[];
};
