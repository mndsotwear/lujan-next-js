/**
 * «طعم‌یاب»: فهرست طعم‌ها، حدس خودکار طعم از نام و توضیح محصول، و رتبه‌بندی بر اساس طعم دلخواه — منطق خالص.
 */

export type Flavor = { slug: string; label: string; emoji: string; words: string[] };

/** ترتیب نمایش دکمه‌ها؛ واژه‌ها هم برای حدس از متن محصول و هم برای متن آزاد مشتری */
export const FLAVORS: Flavor[] = [
  {
    slug: "sweet",
    label: "شیرین",
    emoji: "🍬",
    words: ["شیرین", "شکر", "عسل", "3 در 1", "۳ در ۱", "میکس", "sweet"],
  },
  {
    slug: "bitter",
    label: "تلخ و قوی",
    emoji: "☕",
    words: [
      "تلخ",
      "بدون شکر",
      "خالص",
      "اسپرسو",
      "استرانگ",
      "strong",
      "black",
      "گلد ",
      "gold",
      "مونارک",
      "قهوه فوری",
    ],
  },
  { slug: "spicy", label: "تند", emoji: "🌶️", words: ["تند", "فلفل", "بولداک", "spicy", "hot"] },
  { slug: "caramel", label: "کاراملی", emoji: "🍮", words: ["کارامل", "caramel"] },
  {
    slug: "hazelnut",
    label: "فندقی و مغزدار",
    emoji: "🌰",
    words: ["فندق", "hazelnut", "نوتلا", "بادام", "مغز", "گردو", "پسته", "nuts"],
  },
  {
    slug: "chocolate",
    label: "شکلاتی",
    emoji: "🍫",
    words: [
      "شکلات",
      "کاکائو",
      "موکا",
      "موکاچینو",
      "mocha",
      "choc",
      "نوتلا",
      "کیت کت",
      "توییکس",
      "اسنیکرز",
    ],
  },
  {
    slug: "milky",
    label: "شیری و خامه‌ای",
    emoji: "🥛",
    words: [
      "لته",
      "لاته",
      "کاپوچینو",
      "شیری ",
      "با شیر ",
      "خامه",
      "latte",
      "cappuccino",
      "کافی میت",
    ],
  },
  {
    slug: "fruity",
    label: "میوه‌ای",
    emoji: "🍓",
    words: [
      "میوه",
      "آناناس",
      "پرتقال",
      "توت",
      "انگور",
      "سیب",
      "fruit",
      "ویمتو",
      "سان کوییک",
      "سانکویک",
    ],
  },
  {
    slug: "floral",
    label: "گل و گیاهی",
    emoji: "🌹",
    words: ["گل رز", "گل محمدی", "چای سبز", "نعنا", "گیاهی", "rose"],
  },
  { slug: "saffron", label: "زعفرانی", emoji: "🟠", words: ["زعفران", "saffron"] },
  {
    slug: "spiced",
    label: "ادویه‌ای",
    emoji: "🫚",
    words: ["ماسالا", "دارچین", "هل", "زنجبیل", "جینسینگ", "ادویه", "کرک", "masala", "ginseng"],
  },
  { slug: "cheesy", label: "پنیری", emoji: "🧀", words: ["پنیر", "کاربونارا", "cheese"] },
  { slug: "lemony", label: "لیمویی و ترش", emoji: "🍋", words: ["لیمو", "ترش", "lemon"] },
  {
    slug: "salty",
    label: "شور و تنقلاتی",
    emoji: "🥨",
    words: ["چیپس", "شور", "نمکی", "اسنک", "کچاپ", "پرینگلز"],
  },
];

export const FLAVOR_SLUGS = FLAVORS.map((f) => f.slug);
const bySlug = new Map(FLAVORS.map((f) => [f.slug, f]));
export const flavorLabel = (slug: string) => bySlug.get(slug)?.label ?? slug;
export const isFlavor = (s: string) => bySlug.has(s);

/** یکسان‌سازی ساده‌ی متن فارسی برای جستجوی واژه */
function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/‌/g, " ")
    .replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!)
    .replace(/\s+/g, " ");
}

/** طعم‌هایی که در متن آمده‌اند */
export function flavorsIn(text: string): string[] {
  // فاصله در دو سر تا واژه‌هایی مثل «گلد » در آخر متن هم پیدا شوند
  const t = ` ${norm(text)} `;
  return FLAVORS.filter((f) => f.words.some((w) => t.includes(norm(w)))).map((f) => f.slug);
}

/** حدس طعم محصول: نام وزن بیشتری دارد؛ از توضیح فقط طعم‌هایی که دست‌کم دو بار آمده‌اند */
export function inferFlavors(name: string, summary = "", description = ""): string[] {
  const fromName = flavorsIn(name);
  const body = norm(`${summary} ${description}`);
  const fromBody = FLAVORS.filter(
    (f) => f.words.reduce((n, w) => n + body.split(norm(w)).length - 1, 0) >= 2,
  ).map((f) => f.slug);
  const set = new Set([...fromName, ...fromBody]);
  // «بدون شکر» یعنی شیرین نیست؛ قهوه‌ی شیرین (۳ در ۱) تلخ حساب نمی‌شود
  if (/بدون شکر|رژیمی/.test(norm(name))) set.delete("sweet");
  if (set.has("sweet") && !/تلخ|استرانگ|اسپرسو/.test(norm(name))) set.delete("bitter");
  return FLAVOR_SLUGS.filter((s) => set.has(s));
}

/** خواندن طعم‌های انتخاب‌شده از آدرس (f=caramel,sweet) و متن آزاد (q=…) */
export function parseTaste(raw: { f?: string | string[]; q?: string | string[] }) {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join(",") : (v ?? ""));
  const picked = one(raw.f)
    .split(",")
    .map((s) => s.trim())
    .filter(isFlavor);
  const q = one(raw.q).trim().slice(0, 120);
  const fromText = q ? flavorsIn(q) : [];
  return { picked, q, wanted: [...new Set([...picked, ...fromText])] };
}

/** رتبه‌بندی: بیشترین طعم مشترک، بعد موجود بودن و پرفروشی */
export function rankByTaste<T extends { flavors: string[]; stock: string; soldCount: number }>(
  products: T[],
  wanted: string[],
): (T & { matched: string[] })[] {
  if (!wanted.length) return [];
  return products
    .map((p) => ({ ...p, matched: wanted.filter((w) => p.flavors.includes(w)) }))
    .filter((p) => p.matched.length > 0)
    .sort(
      (a, b) =>
        b.matched.length - a.matched.length ||
        Number(a.stock === "out") - Number(b.stock === "out") ||
        b.soldCount - a.soldCount,
    );
}
