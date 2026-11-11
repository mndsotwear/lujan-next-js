import { describe, expect, it } from "vitest";
import { editDistance } from "./fuzzy";
import { compact, normalize, tokenize } from "./normalize";
import { buildIndex, expandQuery, search } from "./rank";
import { DEFAULT_SYNONYMS } from "./synonyms";

describe("normalize (FR-SRCH-02)", () => {
  it("ي/ك عربی، ارقام، نیم‌فاصله، اعراب", () => {
    expect(normalize("قهوه فوري مدل ٨٠٠")).toBe("قهوه فوری مدل 800");
    expect(normalize("كاور")).toBe("کاور");
    expect(normalize("مدل ۸۰۰")).toBe("مدل 800");
    expect(tokenize("خط‌زن")).toEqual(["خط", "زن"]);
    expect(normalize("قِیچی")).toBe("قیچی");
    expect(compact("ریش تراش")).toBe("ریشتراش");
  });
});

describe("editDistance", () => {
  it("جابه‌جایی، حذف و جایگزینی", () => {
    expect(editDistance("قیچی", "قیحی", 1)).toBe(1);
    expect(editDistance("سشوار", "سشاور", 1)).toBe(1);
    expect(editDistance("ماشین", "ماشن", 1)).toBe(1);
    expect(editDistance("abc", "xyz", 1)).toBe(2);
  });
});

const docs = [
  {
    id: "oil",
    name: "روغن زیتون فرابکر ۵۰۰ میلی‌لیتر",
    brand: "برند نمونه الف",
    category: "روغن زیتون",
    extra: "شیشه‌ای",
    popularity: 900,
    inStock: true,
  },
  {
    id: "coffee",
    name: "قهوه فوری کلاسیک مدل ۸۰۰",
    brand: "برند نمونه الف",
    category: "قهوه فوری",
    extra: "۳ در ۱",
    popularity: 400,
    inStock: true,
  },
  {
    id: "latte",
    name: "کاپوچینو و لاته ۱۲ عددی",
    brand: "برند نمونه الف",
    category: "قهوه فوری",
    extra: "کف شیری",
    popularity: 120,
    inStock: true,
  },
  {
    id: "noodle",
    name: "نودل کره‌ای مرغ تند",
    brand: "برند نمونه ب",
    category: "نودل کره‌ای",
    extra: "خیلی تند",
    popularity: 230,
    inStock: true,
  },
  {
    id: "snack",
    name: "چیپس پنیری ۹۰ گرمی",
    brand: "برند نمونه ج",
    category: "تنقلات",
    extra: "ترد",
    popularity: 130,
    inStock: true,
  },
  {
    id: "tea",
    name: "چای ارل‌گری کیسه‌ای",
    brand: "برند نمونه ج",
    category: "چای",
    extra: "برگاموت",
    popularity: 70,
    inStock: false,
  },
];
const index = buildIndex(docs);
const ids = (q: string) => search(index, q, DEFAULT_SYNONYMS).map((r) => r.id);

describe("search", () => {
  it("دقیق، پیشوندی و با ارقام فارسی/لاتین", () => {
    expect(ids("قهوه فوری")[0]).toBe("coffee");
    expect(ids("قهوه فو")[0]).toBe("coffee");
    expect(ids("مدل 800")).toEqual(["coffee"]);
  });
  it("غلط املایی", () => {
    expect(ids("چیبس")).toEqual(["snack"]);
    expect(ids("نودال")).toEqual(["noodle"]);
  });
  it("ي و ك عربی", () => {
    expect(ids("قهوه فوري")[0]).toBe("coffee");
  });
  it("مترادف‌ها (FR-SRCH-03)", () => {
    expect(ids("نسکافه")[0]).toBe("coffee");
    expect(ids("رامیون")).toEqual(["noodle"]);
    expect(expandQuery("نسکافه کلاسیک", DEFAULT_SYNONYMS)).toContain("قهوه فوری کلاسیک");
  });
  it("نیم‌فاصله و چسبیده", () => {
    expect(ids("روغنزیتون")).toEqual(["oil"]);
    expect(ids("کره ای")).toContain("noodle");
  });
  it("واژه‌ی کوتاه بدون غلط‌یابی؛ بی‌نتیجه خالی", () => {
    expect(ids("xyzxyz")).toEqual([]);
  });
});
