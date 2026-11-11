/**
 * قواعد ویرایش کاتالوگ در پنل (FR-ADM-01, FR-ADM-03، D-012، D-042) — منطق خالص و تست‌شده.
 */
import { toLatinDigits } from "@/lib/format";
import type { SpecField, SpecSchema, SpecValues } from "./specs";

/** نشانی انگلیسی (D-012): حروف کوچک، رقم و خط تیره */
export const validSlug = (s: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length <= 80;
export const normalizeSlug = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");

export const normalizeSku = (s: string) =>
  toLatinDigits(s)
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, "-");

/** کد پیشنهادی وقتی خالی است: از نشانی محصول + شماره‌ی نوع (CLIPPER-MODEL-800-2) */
export function suggestSku(productSlug: string, n: number): string {
  const base =
    productSlug
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "")
      .slice(0, 32) || "SKU";
  return `${base}-${n}`;
}
export const validSku = (s: string) => /^[A-Z0-9][A-Z0-9-]{1,39}$/.test(s);

/** «۴٬۲۵۰٬۰۰۰» یا «4,250,000» ← 4250000؛ خالی ← null؛ نامعتبر ← NaN */
export function parseAmount(input: string | null | undefined): number | null {
  const s = toLatinDigits(String(input ?? "")).replace(/[,٬\s]/g, "");
  if (!s) return null;
  return /^\d{1,10}$/.test(s) ? Number(s) : NaN;
}

export type PriceErrors = Partial<Record<"price" | "salePrice" | "wholesale", string>>;

/** قیمت تخفیفی کمتر از قیمت؛ عمده کمتر یا برابر قیمت (همه تومان، عدد صحیح) */
export function validatePrices(
  price: number | null,
  salePrice: number | null,
  wholesale: number | null,
): PriceErrors {
  const e: PriceErrors = {};
  if (price === null || !Number.isSafeInteger(price) || price <= 0) e.price = "price";
  if (
    salePrice !== null &&
    (!Number.isSafeInteger(salePrice) || salePrice <= 0 || (price !== null && salePrice >= price))
  )
    e.salePrice = "salePrice";
  if (
    wholesale !== null &&
    (!Number.isSafeInteger(wholesale) || wholesale <= 0 || (price !== null && wholesale > price))
  )
    e.wholesale = "wholesale";
  return e;
}

/** ویژگی‌های نوع: هر خط «کلید: مقدار» ← { color: "مشکی" } */
export function parseAttributes(text: string): Record<string, string> | null {
  const out: Record<string, string> = {};
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const i = line.indexOf(":");
    if (i < 1) return null;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim();
    if (!k || !v || k.length > 30 || v.length > 60) return null;
    out[k] = v;
  }
  return out;
}

export const formatAttributes = (a: Record<string, string>) =>
  Object.entries(a)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

export const parseTags = (s: string) =>
  [
    ...new Set(
      s
        .split(/[،,\n]/)
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ].slice(0, 10);

/** فرم مشخصات بر اساس شِمای دسته ← مقادیر تایپ‌شده (خالی = حذف) */
export function parseSpecForm(schema: SpecSchema, get: (key: string) => string | null): SpecValues {
  const values: SpecValues = {};
  for (const f of schema) {
    const raw = (get(`spec_${f.key}`) ?? "").trim();
    if (f.type === "boolean") {
      if (raw === "yes") values[f.key] = true;
      else if (raw === "no") values[f.key] = false;
    } else if (!raw) continue;
    else if (f.type === "number") {
      const n = Number(toLatinDigits(raw).replace(/[,٬]/g, ""));
      values[f.key] = Number.isFinite(n) ? n : (raw as unknown as number);
    } else values[f.key] = raw;
  }
  return values;
}

export type SpecSchemaError = {
  index: number;
  problem: "key" | "duplicate" | "label" | "options" | "unit";
};

/** شِمای مشخصات دسته که در پنل ویرایش شده (FR-ADM-03) */
export function validateSpecSchema(fields: SpecField[]): SpecSchemaError | null {
  const keys = new Set<string>();
  for (const [index, f] of fields.entries()) {
    if (!/^[a-z][a-zA-Z0-9]{1,30}$/.test(f.key)) return { index, problem: "key" };
    if (keys.has(f.key)) return { index, problem: "duplicate" };
    keys.add(f.key);
    if (!f.label.trim()) return { index, problem: "label" };
    if (f.type === "enum") {
      const vals = f.options.map((o) => o.value);
      if (
        !vals.length ||
        new Set(vals).size !== vals.length ||
        f.options.some((o) => !o.label.trim() || !/^[a-z0-9-]+$/.test(o.value))
      )
        return { index, problem: "options" };
    }
    if (f.type === "number" && !f.unit.trim()) return { index, problem: "unit" };
  }
  return null;
}

// ───────── توضیحات با قالب پایه (D-044) ─────────

export type Inline = { text: string; bold: boolean };
export type Block =
  { type: "h"; text: Inline[] } | { type: "p"; text: Inline[] } | { type: "ul"; items: Inline[][] };

/** «**پررنگ**» ← بخش‌های پررنگ و عادی (بدون HTML؛ React خودش escape می‌کند) */
export function parseInline(s: string): Inline[] {
  const out: Inline[] = [];
  const parts = s.split("**");
  parts.forEach((t, i) => {
    if (!t) return;
    // تعداد ستاره‌ها فرد باشد، آخرین تکه عادی می‌ماند
    const bold = i % 2 === 1 && i < parts.length - 1;
    out.push({ text: bold ? t : i % 2 === 1 ? `**${t}` : t, bold });
  });
  return out;
}

/** «## تیتر»، «- مورد»، خط خالی = پاراگراف تازه */
export function parseRichText(text: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: Inline[][] | null = null;
  const flush = () => {
    if (para.length) blocks.push({ type: "p", text: parseInline(para.join(" ")) });
    para = [];
    if (list) blocks.push({ type: "ul", items: list });
    list = null;
  };
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (line.startsWith("## ")) {
      flush();
      blocks.push({ type: "h", text: parseInline(line.slice(3).trim()) });
    } else if (/^[-•*]\s+/.test(line)) {
      if (para.length) {
        blocks.push({ type: "p", text: parseInline(para.join(" ")) });
        para = [];
      }
      (list ??= []).push(parseInline(line.replace(/^[-•*]\s+/, "")));
    } else {
      if (list) {
        blocks.push({ type: "ul", items: list });
        list = null;
      }
      para.push(line);
    }
  }
  flush();
  return blocks;
}

/** متن ساده از متن قالب‌دار (برای توضیح متا و داده‌ی ساختاریافته) */
export function richTextPlain(text: string): string {
  const inline = (xs: Inline[]) => xs.map((x) => x.text).join("");
  return parseRichText(text)
    .map((b) => (b.type === "ul" ? b.items.map(inline).join("، ") : inline(b.text)))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
