/**
 * ورود محصولات واقعی lujan.ir به پایگاه داده — اجرا: npm run import:lujan
 * ورودی: data/lujan-products.json (خروجی Store API ووکامرس سایت lujan.ir)
 * قابل اجرای چندباره (upsert با slug و SKU)؛ محصولات نمونه بایگانی می‌شوند.
 * کالاهای آرایشی/بهداشتی و شوینده فعلاً وارد نمی‌شوند (فقط شش دسته‌ی خوراکی لوجان).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { db } from "../src/lib/db";
import { inferFlavors } from "../src/modules/catalog/flavors";

type WcProduct = {
  id: number;
  name: string;
  slug: string;
  short: string;
  desc: string;
  prices: { regular_price: string; sale_price: string; price: string };
  rating: string;
  reviews: number;
  images: { src: string; alt: string }[];
  categories: { id: number; name: string; slug: string }[];
  attributes: { name: string; terms: string[] }[];
  in_stock: boolean;
  stock?: string;
};

// ── کمکی‌های متن ──
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const latinDigits = (s: string) =>
  s.replace(/[۰-۹٠-٩]/g, (d) => String(Math.max(FA_DIGITS.indexOf(d), AR_DIGITS.indexOf(d))));

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  zwnj: "‌",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  laquo: "«",
  raquo: "»",
};
const decode = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);

const stripTags = (s: string) =>
  decode(s.replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+/g, " ")
    .trim();

/** HTML ووکامرس ← قالب ساده‌ی RichText (## تیتر، - فهرست، **پررنگ**) */
function htmlToRich(html: string): string {
  let s = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/\r/g, "")
    .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_, t) => `\n\n## ${stripTags(t)}\n\n`)
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, t) => `\n- ${t}`)
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, t) => {
      const x = stripTags(t);
      return x ? `**${x}**` : "";
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|ul|ol|table|tr|blockquote)>/gi, "\n\n")
    .replace(/<\/t[dh]>/gi, " — ");
  s = decode(s.replace(/<[^>]+>/g, ""));
  return s
    .split("\n")
    .map((l) =>
      l
        .replace(/[ \t]+/g, " ")
        .replace(/\s*—\s*$/, "")
        .trim(),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** نام تمیز: «خرید» اول نام و توضیح‌های تبلیغاتی بعد از | حذف می‌شود */
function cleanName(raw: string): string {
  const parts = decode(raw)
    .replace(/^خرید\s+/, "")
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean);
  let name = parts[0] ?? "";
  for (const p of parts.slice(1)) {
    if (/قیمت|بهترین|خرید/.test(p)) continue;
    const short = name.split(/\s+/).length <= 2;
    const hasNumber = /[0-9۰-۹]/.test(p) && p.length <= 32;
    if (short || hasNumber) name = `${name} ${p}`;
  }
  return name.replace(/\s+/g, " ").trim();
}

function summaryOf(shortHtml: string, fallback: string): string {
  const t = stripTags(shortHtml.replace(/<\/p>/gi, " ")).replace(/\s+/g, " ");
  if (!t) return fallback;
  const cut = t.split(/(?<=[.!؟])\s/)[0] ?? t;
  return cut.length > 140 ? cut.slice(0, 137).replace(/\s+\S*$/, "") + "…" : cut;
}

function seoDescriptionOf(shortHtml: string): string | null {
  const t = stripTags(shortHtml.replace(/<\/p>/gi, " ")).replace(/\s+/g, " ");
  if (!t) return null;
  return t.length > 160 ? t.slice(0, 157).replace(/\s+\S*$/, "") + "…" : t;
}

/** وزن تقریبی هر عدد برای محاسبه‌ی ارسال، از روی نام؛ پیش‌فرض ۵۰۰ گرم */
function weightOf(name: string): number {
  const n = latinDigits(name).replace(/٫/g, ".");
  const m = n.match(
    /(\d+(?:\.\d+)?)\s*(کیلوگرم|کیلویی|کیلو|گرمی|گرم|میلی‌?لیتری|میلی‌?لیتر|میل|لیتری|لیتر)/,
  );
  if (!m) return 500;
  const v = Number(m[1]);
  const unit = m[2]!;
  let g = 500;
  if (/^کیلو/.test(unit)) g = v * 1000;
  else if (/^گرم/.test(unit)) g = v;
  else if (/^میل/.test(unit)) g = v;
  else if (/^لیتر/.test(unit)) g = v * 1000;
  const pack = n.match(/(\d+)\s*عدد/);
  if (pack && g < 100) g *= Number(pack[1]);
  return Math.max(50, Math.round(g * 1.1)); // ۱۰٪ برای ظرف
}

function stockOf(p: WcProduct): number {
  if (!p.in_stock) return 0;
  const m = latinDigits(p.stock ?? "").match(/\d+/);
  return m ? Number(m[0]) : 10; // سایت فعلی برای این کالا موجودی عددی ندارد
}

// ── دسته ──
const SKIP_CATS = new Set(["healthcare", "makeup", "ارایشی-بهداشتی", "cleaner", "toner"]);
const CAT_BY_WP: [string, string[]][] = [
  ["korean-noodles", ["nodel"]],
  ["instant-coffee", ["cafe", "tora-bika", "jacob", "ali-cafe", "good-day", "nescafe"]],
  ["syrup", ["drink", "sunquiq", "luca-rose-syrup", "vimto"]],
  ["olive-oil", ["olive-oil", "oil", "asil-oil"]],
  ["tea", ["chay", "tee"]],
  ["snacks", ["junk-food", "breakfast", "pineapple", "کره-بادم-زمینی", "foodstuffs"]],
];
/** کالاهایی که دسته‌ی سایت فعلی‌شان اشتباه یا ناقص است */
const CAT_OVERRIDE: Record<number, string> = {
  1296: "instant-coffee", // علی کافه طلایی در دسته‌ی چای ثبت شده
  1293: "instant-coffee",
  1289: "tea", // چای لاته علی تی
  1152: "instant-coffee", // جاکوبز مونارک بدون دسته‌ی قهوه
  1258: "snacks", // جو دوسر
};

function categoryOf(p: WcProduct): string | null {
  if (CAT_OVERRIDE[p.id]) return CAT_OVERRIDE[p.id]!;
  const slugs = p.categories.map((c) => c.slug);
  if (!slugs.length || slugs.some((s) => SKIP_CATS.has(s))) return null;
  for (const [ours, wp] of CAT_BY_WP) if (slugs.some((s) => wp.includes(s))) return ours;
  return null;
}

// ── برند ──
const BRANDS: [RegExp, string, string][] = [
  [/bertini|برتینی/i, "bertini", "برتینی (Bertini)"],
  [/nutella|نوتلا/i, "nutella", "نوتلا (Nutella)"],
  [/مولا/i, "mula", "مولا"],
  // «اصیل» در توضیح‌ها زیاد می‌آید (طعم اصیل)؛ فقط کنار «روغن»
  [/\basil\b|روغن[^|]*اصیل/i, "asil", "اصیل"],
  [/golden view|گلدن ویو/i, "golden-view", "گلدن ویو (Golden View)"],
  [/golden ring|گلدن رینگ/i, "golden-ring", "گلدن رینگ (Golden Ring)"],
  [/samyang|سامیانگ/i, "samyang", "سامیانگ (Samyang)"],
  [/daebak|دایباک/i, "daebak", "دایباک (Daebak)"],
  [/indomie|اندومی/i, "indomie", "اندومی (Indomie)"],
  [/galaxy|گلکسی/i, "galaxy", "گلکسی (Galaxy)"],
  [/jacobs|جاکوبز/i, "jacobs", "جاکوبز (Jacobs)"],
  [/nestl[eé]|نستله/i, "nestle", "نستله (Nestlé)"],
  [/nescaf|نسکافه/i, "nescafe", "نسکافه (Nescafé)"],
  [/good ?day|گود ?دی|گوددی/i, "good-day", "گود دی (Good Day)"],
  [/luca|لوکا/i, "luca", "لوکا (Luca)"],
  [/salvo|سالوو/i, "salvo", "سالوو (Salvo)"],
  [/فرندز/i, "friends", "فرندز"],
  [/jif|جیف/i, "jif", "جیف (Jif)"],
  [/المنیس/i, "almanis", "المنیس"],
  [/شای کرک/i, "shay-karak", "شای کرک"],
  [/کمل/i, "camel", "کمل"],
  [/torabika|تورابیکا|ترابیکا/i, "torabika", "تورابیکا (Torabika)"],
  [/\bRS\b/, "rs", "RS"],
  [/رویال/i, "royal", "رویال"],
  [/ali ?tea|علی تی/i, "ali-tea", "علی تی (Ali Tea)"],
  [/ali ?cafe|علی کافه/i, "alicafe", "علی کافه (Alicafe)"],
  [/quaker|کواکر/i, "quaker", "کواکر (Quaker)"],
  [/snickers|اسنیکرز/i, "snickers", "اسنیکرز (Snickers)"],
  [/twix|توییکس/i, "twix", "توییکس (Twix)"],
  [/تیفانی/i, "tiffany", "تیفانی"],
  [/ding ?dong|دینگ دونگ/i, "ding-dong", "دینگ دونگ (Ding Dong)"],
  [/pringles|پرینگلز/i, "pringles", "پرینگلز (Pringles)"],
  [/کیت ?کت|kit ?kat/i, "kitkat", "کیت‌کت (KitKat)"],
  [/دو غزال/i, "do-ghazal", "دوغزال"],
  [/گلابی/i, "golabi", "گلابی"],
  [/امیننت/i, "eminent", "امیننت"],
  [/sunquick|سان ?کوییک|سانکویک/i, "sunquick", "سان‌کوییک (Sunquick)"],
  [/vimto|ویمتو/i, "vimto", "ویمتو (Vimto)"],
  [/ساندو/i, "sando", "ساندو"],
];
const OTHER_BRAND = { slug: "other", name: "سایر برندها" };

function brandOf(p: WcProduct): { slug: string; name: string } {
  const attr = p.attributes.find((a) => a.name === "برند")?.terms.join(" ") ?? "";
  for (const text of [attr, decode(p.name)]) {
    if (!text) continue;
    const hit = BRANDS.find(([re]) => re.test(text));
    if (hit) return { slug: hit[1], name: hit[2] };
  }
  return OTHER_BRAND;
}

async function main() {
  const file = path.join(process.cwd(), "data", "lujan-products.json");
  const items = JSON.parse(readFileSync(file, "utf8")) as WcProduct[];

  const catId = new Map((await db.category.findMany()).map((c) => [c.slug, c.id]));
  const skipped: string[] = [];
  const imported: string[] = [];
  const perCat: Record<string, number> = {};

  for (const p of items) {
    const cat = categoryOf(p);
    if (!cat || !catId.has(cat)) {
      skipped.push(`${p.id} ${cleanName(p.name)}`);
      continue;
    }
    const b = brandOf(p);
    const brand = await db.brand.upsert({
      where: { slug: b.slug },
      update: { name: b.name },
      create: b,
    });

    const name = cleanName(p.name);
    const regular = Number(p.prices.regular_price) || Number(p.prices.price);
    const sale = Number(p.prices.sale_price);
    const data = {
      name,
      categoryId: catId.get(cat)!,
      brandId: brand.id,
      summary: summaryOf(p.short, name),
      description: htmlToRich(p.desc) || null,
      seoDescription: seoDescriptionOf(p.short),
      status: "PUBLISHED" as const,
      ratingAvg: Number(p.rating) || 0,
      ratingCount: p.reviews || 0,
    };
    const product = await db.product.upsert({
      where: { slug: p.slug },
      update: data,
      create: { slug: p.slug, ...data, specs: {}, tags: [] },
    });
    // طعم‌ها فقط وقتی هنوز خالی است حدس زده می‌شوند (اصلاح مدیر در پنل حفظ می‌شود)
    if (!product.flavors.length) {
      const flavors = inferFlavors(name, stripTags(p.short));
      if (flavors.length) await db.product.update({ where: { id: product.id }, data: { flavors } });
    }

    const vData = {
      productId: product.id,
      price: regular,
      salePrice: sale && sale < regular ? sale : null,
      weightGrams: weightOf(name),
    };
    const variant = await db.variant.upsert({
      where: { sku: `LJ-${p.id}` },
      update: vData,
      create: { sku: `LJ-${p.id}`, ...vData },
    });
    const onHand = stockOf(p);
    await db.inventory.upsert({
      where: { variantId: variant.id },
      update: { onHand },
      create: { variantId: variant.id, onHand, lowStockThreshold: 2 },
    });

    await db.productImage.deleteMany({ where: { productId: product.id } });
    if (p.images.length)
      await db.productImage.createMany({
        data: p.images.map((img, i) => ({
          productId: product.id,
          url: img.src,
          alt: decode(img.alt || "") || name,
          sortOrder: i,
        })),
      });

    perCat[cat] = (perCat[cat] ?? 0) + 1;
    imported.push(p.slug);
  }

  // محصولات نمونه از فروشگاه برداشته می‌شوند (حذف نمی‌شوند)
  const archived = await db.product.updateMany({
    where: { name: { contains: "(نمونه)" }, status: { not: "ARCHIVED" } },
    data: { status: "ARCHIVED" },
  });

  console.log(`✓ ${imported.length} محصول از lujan.ir وارد یا به‌روز شد`);
  console.log(`  به تفکیک دسته: ${JSON.stringify(perCat)}`);
  console.log(`  ${archived.count} محصول نمونه بایگانی شد`);
  console.log(`  ${skipped.length} کالا وارد نشد (غیرخوراکی یا بدون دسته):`);
  for (const s of skipped) console.log(`   - ${s}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
