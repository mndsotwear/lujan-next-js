import { describe, expect, it } from "vitest";
import {
  normalizeSku,
  normalizeSlug,
  suggestSku,
  parseAmount,
  parseAttributes,
  parseInline,
  parseRichText,
  parseSpecForm,
  parseTags,
  validatePrices,
  validateSpecSchema,
  validSku,
  validSlug,
} from "./admin-rules";
import { SPEC_SCHEMAS } from "./specs";

describe("نشانی و کد کالا (D-012)", () => {
  it("slug انگلیسی", () => {
    expect(validSlug("nescafe-gold-200")).toBe(true);
    expect(validSlug("ماشین")).toBe(false);
    expect(validSlug("a--b")).toBe(false);
    expect(normalizeSlug(" Nescafe Gold_200 ")).toBe("nescafe-gold-200");
  });
  it("SKU", () => {
    expect(normalizeSku(" cl 800 bk ")).toBe("CL-800-BK");
    expect(validSku("CL-800-BK")).toBe(true);
    expect(validSku("-X")).toBe(false);
    expect(normalizeSku("cl۸۰۰ bk")).toBe("CL800-BK");
    expect(suggestSku("nescafe-gold-200", 2)).toBe("NESCAFE-GOLD-200-2");
  });
});

describe("قیمت (D-042)", () => {
  it("خواندن عدد فارسی با جداکننده", () => {
    expect(parseAmount("۴٬۲۵۰٬۰۰۰")).toBe(4_250_000);
    expect(parseAmount("4,250,000")).toBe(4_250_000);
    expect(parseAmount("")).toBe(null);
    expect(parseAmount("12.5")).toBeNaN();
  });
  it("تخفیفی کمتر از قیمت، عمده حداکثر قیمت", () => {
    expect(validatePrices(1000, 900, 880)).toEqual({});
    expect(validatePrices(1000, 1000, null).salePrice).toBe("salePrice");
    expect(validatePrices(1000, null, 1200).wholesale).toBe("wholesale");
    expect(validatePrices(0, null, null).price).toBe("price");
  });
});

describe("ویژگی و برچسب", () => {
  it("ویژگی‌های نوع", () => {
    expect(parseAttributes("color: مشکی مات\n\n")).toEqual({ color: "مشکی مات" });
    expect(parseAttributes("بدون دونقطه")).toBe(null);
  });
  it("برچسب‌ها بدون تکرار", () =>
    expect(parseTags("جدید، پرفروش,جدید")).toEqual(["جدید", "پرفروش"]));
});

describe("فرم مشخصات", () => {
  it("تبدیل نوع‌ها و نادیده گرفتن خالی", () => {
    const form: Record<string, string> = {
      spec_kind: "mix3in1",
      spec_netWeightG: "۳۶۰",
      spec_decaf: "yes",
      spec_origin: "",
    };
    expect(parseSpecForm(SPEC_SCHEMAS.coffee, (k) => form[k] ?? null)).toEqual({
      kind: "mix3in1",
      netWeightG: 360,
      decaf: true,
    });
  });
  it("شِمای دسته", () => {
    expect(validateSpecSchema([...SPEC_SCHEMAS.coffee])).toBe(null);
    expect(
      validateSpecSchema([
        { key: "a1", label: "الف", type: "text", filterable: false },
        { key: "a1", label: "ب", type: "text", filterable: false },
      ]),
    ).toEqual({ index: 1, problem: "duplicate" });
    expect(
      validateSpecSchema([{ key: "w", label: "x", type: "number", unit: "", filterable: true }]),
    ).toEqual({ index: 0, problem: "key" });
    expect(
      validateSpecSchema([
        { key: "use", label: "کاربرد", type: "enum", options: [], filterable: true },
      ]),
    ).toEqual({ index: 0, problem: "options" });
  });
});

describe("توضیحات با قالب پایه (D-044)", () => {
  it("پررنگ", () => {
    expect(parseInline("موتور **روتاری** قوی")).toEqual([
      { text: "موتور ", bold: false },
      { text: "روتاری", bold: true },
      { text: " قوی", bold: false },
    ]);
    expect(parseInline("نیمه **باز")).toEqual([
      { text: "نیمه ", bold: false },
      { text: "**باز", bold: false },
    ]);
  });
  it("تیتر، فهرست و پاراگراف", () => {
    const b = parseRichText(
      "## ویژگی‌ها\n- باتری ۱۲۰ دقیقه\n- کار هنگام شارژ\nمناسب آرایشگاه.\n\nخط دوم",
    );
    expect(b.map((x) => x.type)).toEqual(["h", "ul", "p", "p"]);
    expect(b[1]).toMatchObject({ type: "ul" });
    expect((b[1] as { items: unknown[] }).items.length).toBe(2);
  });
  it("HTML متن عادی می‌ماند", () =>
    expect(parseRichText("<script>x</script>")).toEqual([
      { type: "p", text: [{ text: "<script>x</script>", bold: false }] },
    ]));
});
