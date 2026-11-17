/**
 * داده‌ی نمونه M1.2 — برندها، قیمت‌ها و موجودی‌ها ساختگی‌اند و فقط برای ساخت و تست استفاده می‌شوند.
 * داده‌ی واقعی بعداً با ورود اکسل از پنل مدیریت (FR-ADM-02) جایگزین می‌شود.
 */
import { SPEC_SCHEMAS } from "../src/modules/catalog/specs";
import type { SpecSchema, SpecValues } from "../src/modules/catalog/specs";

export type SeedCategory = { slug: string; name: string; icon: string; specSchema: SpecSchema };
export type SeedVariant = {
  sku: string;
  attributes?: Record<string, string>;
  price: number;
  salePrice?: number;
  weightGrams: number;
  /** ابعاد بسته به سانتی‌متر [طول، عرض، ارتفاع] برای وزن حجمی (D-029) */
  dims?: [number, number, number];
  onHand: number;
  wholesale?: number; // قیمت عمده سطح ۱
};
export type SeedProduct = {
  slug: string;
  name: string;
  category: string;
  brand: string;
  summary: string;
  description?: string;
  specs: SpecValues;
  warrantyMonths?: number;
  tags?: string[];
  rating?: [number, number];
  sold?: number;
  variants: SeedVariant[];
};

export const categories: SeedCategory[] = [
  { slug: "instant-coffee", name: "قهوه فوری", icon: "coffee", specSchema: SPEC_SCHEMAS.coffee },
  { slug: "syrup", name: "شربت", icon: "syrup", specSchema: SPEC_SCHEMAS.syrup },
  { slug: "snacks", name: "تنقلات", icon: "snack", specSchema: SPEC_SCHEMAS.snack },
  { slug: "korean-noodles", name: "نودل کره‌ای", icon: "noodle", specSchema: SPEC_SCHEMAS.noodle },
  { slug: "olive-oil", name: "روغن و زیتون", icon: "olive", specSchema: SPEC_SCHEMAS.oliveOil },
  { slug: "tea", name: "چای", icon: "tea", specSchema: SPEC_SCHEMAS.tea },
];

export const brands = [
  { slug: "brand-a", name: "برند نمونه الف" },
  { slug: "brand-b", name: "برند نمونه ب" },
  { slug: "brand-c", name: "برند نمونه ج" },
  { slug: "brand-d", name: "برند نمونه د" },
];

const v = (
  sku: string,
  price: number,
  onHand: number,
  weightGrams: number,
  extra: Partial<SeedVariant> = {},
): SeedVariant => ({
  sku,
  price,
  onHand,
  weightGrams,
  wholesale: Math.round((price * 0.9) / 1000) * 1000,
  ...extra,
});

export const products: SeedProduct[] = [
  // ── قهوه فوری (نمونه) ──
  {
    slug: "coffee-3in1-classic",
    name: "قهوه فوری ۳ در ۱ کلاسیک (نمونه)",
    category: "instant-coffee",
    brand: "brand-a",
    summary: "قهوه، شیرخشک و شکر؛ جعبه ۲۰ عددی",
    description:
      "قهوه ۳ در ۱ آماده‌ی دم‌کردن در چند ثانیه؛ برای صبحانه، محل کار و سفر. این محصول نمونه است و با محصول واقعی لوجان جایگزین می‌شود.",
    specs: { kind: "mix3in1", netWeightG: 360, servings: 20, decaf: false, origin: "کره جنوبی" },
    tags: ["پرفروش"],
    rating: [4.6, 96],
    sold: 320,
    variants: [v("CF-31-20", 260000, 120, 420, { salePrice: 235000 })],
  },
  {
    slug: "coffee-pure-gold-200",
    name: "قهوه فوری خالص گلد ۲۰۰ گرمی (نمونه)",
    category: "instant-coffee",
    brand: "brand-b",
    summary: "فریز‌درای، طعم ملایم و معطر",
    specs: { kind: "pure", netWeightG: 200, servings: 100, decaf: false, origin: "سوئیس" },
    rating: [4.8, 61],
    sold: 140,
    variants: [v("CF-GOLD-200", 890000, 40, 330)],
  },
  {
    slug: "coffee-latte-12",
    name: "کاپوچینو و لاته ۱۲ عددی (نمونه)",
    category: "instant-coffee",
    brand: "brand-a",
    summary: "کف شیری، بدون نیاز به دستگاه",
    specs: { kind: "latte", netWeightG: 216, servings: 12, decaf: false, origin: "مالزی" },
    rating: [4.4, 33],
    sold: 90,
    variants: [v("CF-LAT-12", 210000, 60, 260)],
  },

  // ── شربت ──
  {
    slug: "syrup-sour-cherry-700",
    name: "شربت آلبالو ۷۰۰ میلی‌لیتر (نمونه)",
    category: "syrup",
    brand: "brand-c",
    summary: "غلیظ، مناسب خنک‌نوشی تابستان",
    specs: { flavor: "آلبالو", volumeMl: 700, sugarFree: false, origin: "ایران" },
    rating: [4.5, 41],
    sold: 120,
    variants: [v("SY-ALB-700", 140000, 90, 1100)],
  },
  {
    slug: "syrup-mint-sugarfree-500",
    name: "شربت نعناع بدون شکر ۵۰۰ میلی‌لیتر (نمونه)",
    category: "syrup",
    brand: "brand-c",
    summary: "کم‌کالری با شیرین‌کننده طبیعی",
    specs: { flavor: "نعناع", volumeMl: 500, sugarFree: true, origin: "ایران" },
    rating: [4.2, 18],
    sold: 55,
    variants: [v("SY-NAN-500", 165000, 45, 800)],
  },
  {
    slug: "syrup-vanilla-coffee-750",
    name: "سیروپ وانیل مخصوص قهوه ۷۵۰ میلی‌لیتر (نمونه)",
    category: "syrup",
    brand: "brand-b",
    summary: "برای لاته و میلک‌شیک",
    specs: { flavor: "وانیل", volumeMl: 750, sugarFree: false, origin: "فرانسه" },
    rating: [4.7, 27],
    sold: 70,
    variants: [v("SY-VAN-750", 520000, 25, 1300)],
  },

  // ── تنقلات ──
  {
    slug: "snack-chips-cheese-90",
    name: "چیپس پنیری ۹۰ گرمی (نمونه)",
    category: "snacks",
    brand: "brand-d",
    summary: "ترد و پرچاشنی",
    specs: { kind: "chips", netWeightG: 90, flavor: "پنیر", origin: "ایران" },
    tags: ["پرفروش"],
    rating: [4.3, 77],
    sold: 400,
    variants: [v("SN-CH-90", 65000, 300, 120)],
  },
  {
    slug: "snack-choco-biscuit-200",
    name: "بیسکویت شکلاتی ۲۰۰ گرمی (نمونه)",
    category: "snacks",
    brand: "brand-d",
    summary: "کره‌ای، با روکش شکلات شیری",
    specs: { kind: "biscuit", netWeightG: 200, flavor: "شکلات شیری", origin: "کره جنوبی" },
    rating: [4.6, 52],
    sold: 180,
    variants: [v("SN-BI-200", 190000, 80, 260)],
  },
  {
    slug: "snack-mixed-nuts-300",
    name: "آجیل مخلوط ۳۰۰ گرمی (نمونه)",
    category: "snacks",
    brand: "brand-a",
    summary: "بادام، گردو، پسته و کشمش",
    specs: { kind: "nuts", netWeightG: 300, flavor: "ساده", origin: "ایران" },
    rating: [4.5, 29],
    sold: 85,
    variants: [v("SN-NU-300", 480000, 35, 350)],
  },

  // ── نودل کره‌ای ──
  {
    slug: "noodle-hot-chicken-140",
    name: "نودل کره‌ای مرغ تند ۱۴۰ گرمی (نمونه)",
    category: "korean-noodles",
    brand: "brand-b",
    summary: "خشک و سرخ‌شده، خیلی تند",
    description: "نودل خشک با سس تند مرغ؛ در ۵ دقیقه آماده می‌شود. این محصول نمونه است.",
    specs: {
      spice: "extra-hot",
      style: "stir-fried",
      netWeightG: 140,
      flavor: "مرغ",
      origin: "کره جنوبی",
    },
    tags: ["پرفروش", "تند"],
    rating: [4.8, 210],
    sold: 760,
    variants: [v("NO-HC-140", 78000, 400, 160, { salePrice: 69000 })],
  },
  {
    slug: "noodle-soup-beef-120",
    name: "نودل سوپی گوشت ۱۲۰ گرمی (نمونه)",
    category: "korean-noodles",
    brand: "brand-b",
    summary: "سوپی، تندی متوسط",
    specs: { spice: "medium", style: "soup", netWeightG: 120, flavor: "گوشت", origin: "کره جنوبی" },
    rating: [4.5, 88],
    sold: 310,
    variants: [v("NO-SB-120", 62000, 250, 140)],
  },
  {
    slug: "noodle-cup-kimchi-65",
    name: "نودل لیوانی کیمچی ۶۵ گرمی (نمونه)",
    category: "korean-noodles",
    brand: "brand-d",
    summary: "لیوانی، آماده با آب جوش",
    specs: { spice: "hot", style: "cup", netWeightG: 65, flavor: "کیمچی", origin: "کره جنوبی" },
    rating: [4.4, 44],
    sold: 150,
    variants: [v("NO-CK-65", 54000, 180, 110)],
  },

  // ── روغن زیتون ──
  {
    slug: "olive-oil-extra-virgin-500",
    name: "روغن زیتون فرابکر ۵۰۰ میلی‌لیتر (نمونه)",
    category: "olive-oil",
    brand: "brand-c",
    summary: "بطری شیشه‌ای، اسیدیته زیر ۰٫۸",
    specs: {
      grade: "extra-virgin",
      volumeMl: 500,
      acidity: 0.5,
      packaging: "glass",
      origin: "ایران",
    },
    tags: ["پرفروش"],
    rating: [4.7, 64],
    sold: 200,
    variants: [v("OL-EV-500", 480000, 70, 900, { salePrice: 445000 })],
  },
  {
    slug: "olive-oil-extra-virgin-can-4l",
    name: "روغن زیتون فرابکر حلب ۴ لیتری (نمونه)",
    category: "olive-oil",
    brand: "brand-c",
    summary: "حلب ۴ لیتری، مناسب مصرف خانواده",
    specs: {
      grade: "extra-virgin",
      volumeMl: 4000,
      acidity: 0.6,
      packaging: "can",
      origin: "اسپانیا",
    },
    rating: [4.6, 22],
    sold: 40,
    variants: [v("OL-EV-4L", 3200000, 15, 4300, { dims: [20, 14, 28] })],
  },
  {
    slug: "olive-oil-pure-1l",
    name: "روغن زیتون خالص ۱ لیتری (نمونه)",
    category: "olive-oil",
    brand: "brand-a",
    summary: "مناسب سرخ‌کردن و پخت",
    specs: { grade: "pure", volumeMl: 1000, acidity: 1.0, packaging: "plastic", origin: "ایتالیا" },
    rating: [4.3, 17],
    sold: 60,
    variants: [v("OL-PU-1L", 690000, 40, 1100)],
  },

  // ── چای ──
  {
    slug: "tea-black-leaf-500",
    name: "چای سیاه برگی ۵۰۰ گرمی (نمونه)",
    category: "tea",
    brand: "brand-d",
    summary: "عطر قوی و رنگ پررنگ",
    specs: { kind: "black", form: "leaf", netWeightG: 500, origin: "ایران" },
    tags: ["پرفروش"],
    rating: [4.6, 133],
    sold: 520,
    variants: [v("TE-BL-500", 395000, 150, 560)],
  },
  {
    slug: "tea-earl-grey-bags-100",
    name: "چای ارل‌گری ۱۰۰ عددی کیسه‌ای (نمونه)",
    category: "tea",
    brand: "brand-b",
    summary: "با عطر برگاموت",
    specs: { kind: "earl-grey", form: "bag", netWeightG: 200, origin: "سریلانکا" },
    rating: [4.5, 58],
    sold: 170,
    variants: [v("TE-EG-100", 340000, 90, 260)],
  },
  {
    slug: "tea-green-herbal-25",
    name: "دمنوش سبز و نعناع ۲۵ عددی (نمونه)",
    category: "tea",
    brand: "brand-a",
    summary: "کیسه‌ای، بدون کافئین زیاد",
    specs: { kind: "herbal", form: "bag", netWeightG: 50, origin: "ایران" },
    rating: [4.2, 21],
    sold: 65,
    variants: [v("TE-GH-25", 120000, 100, 90)],
  },
];

/** قوانین دستی مکمل (FR-REC-09) — [مبدأ، مقصد، برچسب علت] */
export const recommendationRules: [string, string, string][] = [
  ["coffee-3in1-classic", "syrup-vanilla-coffee-750", "برای قهوه‌ی خوشمزه‌تر"],
  ["coffee-pure-gold-200", "syrup-vanilla-coffee-750", "برای قهوه‌ی خوشمزه‌تر"],
  ["coffee-latte-12", "snack-choco-biscuit-200", "همراه قهوه"],
  ["noodle-hot-chicken-140", "snack-chips-cheese-90", "معمولاً با هم خریده می‌شوند"],
  ["noodle-hot-chicken-140", "syrup-sour-cherry-700", "برای خنک کردن تندی"],
  ["noodle-soup-beef-120", "noodle-cup-kimchi-65", "معمولاً با هم خریده می‌شوند"],
  ["tea-black-leaf-500", "snack-mixed-nuts-300", "همراه چای"],
  ["tea-earl-grey-bags-100", "snack-choco-biscuit-200", "همراه چای"],
  ["olive-oil-extra-virgin-500", "olive-oil-pure-1l", "برای پخت و پز"],
];

export const coupons = [
  {
    code: "LUJAN10",
    type: "PERCENT" as const,
    value: 10,
    minSubtotal: 500000,
    maxDiscount: 300000,
  },
];
