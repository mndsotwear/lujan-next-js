/**
 * شِمای مشخصات فنی هر دسته (بخش ۴-۱ SRS) و اعتبارسنجی مقادیر محصول.
 * همین شِما برای فیلترها (FR-CAT-02)، جدول مشخصات، مقایسه (FR-CAT-05) و دستیار (FR-AI-04) استفاده می‌شود.
 * ریسک «کیفیت پایین داده محصول» (بخش ۱۶): هر محصول هنگام ورود با validateSpecs بررسی می‌شود.
 */

export type SpecField =
  | {
      key: string;
      label: string;
      type: "enum";
      options: readonly { value: string; label: string }[];
      filterable: boolean;
      required?: boolean;
    }
  | {
      key: string;
      label: string;
      type: "number";
      unit: string;
      filterable: boolean;
      required?: boolean;
    }
  | { key: string; label: string; type: "boolean"; filterable: boolean; required?: boolean }
  | { key: string; label: string; type: "text"; filterable: false; required?: boolean };

export type SpecSchema = readonly SpecField[];
export type SpecValues = Record<string, string | number | boolean>;

export function validateSpecs(schema: SpecSchema, values: SpecValues): string[] {
  const errors: string[] = [];
  const known = new Set(schema.map((f) => f.key));
  for (const key of Object.keys(values)) {
    if (!known.has(key)) errors.push(`مشخصه‌ی ناشناخته: ${key}`);
  }
  for (const f of schema) {
    const v = values[f.key];
    if (v === undefined) {
      if (f.required) errors.push(`«${f.label}» الزامی است`);
      continue;
    }
    switch (f.type) {
      case "enum":
        if (typeof v !== "string" || !f.options.some((o) => o.value === v))
          errors.push(`«${f.label}» مقدار نامعتبر دارد: ${String(v)}`);
        break;
      case "number":
        if (typeof v !== "number" || !Number.isFinite(v) || v < 0)
          errors.push(`«${f.label}» باید عدد نامنفی باشد`);
        break;
      case "boolean":
        if (typeof v !== "boolean") errors.push(`«${f.label}» باید بله/خیر باشد`);
        break;
      case "text":
        if (typeof v !== "string" || !v.trim()) errors.push(`«${f.label}» خالی است`);
        break;
    }
  }
  return errors;
}

/** شِمای دسته‌های لوجان: قهوه فوری، شربت، تنقلات، نودل کره‌ای، روغن زیتون، چای */
export const SPEC_SCHEMAS = {
  coffee: [
    {
      key: "kind",
      label: "نوع قهوه",
      type: "enum",
      filterable: true,
      required: true,
      options: [
        { value: "pure", label: "قهوه فوری خالص" },
        { value: "mix3in1", label: "۳ در ۱" },
        { value: "latte", label: "لاته و کاپوچینو" },
      ],
    },
    {
      key: "netWeightG",
      label: "وزن خالص",
      type: "number",
      unit: "گرم",
      filterable: true,
      required: true,
    },
    { key: "servings", label: "تعداد وعده", type: "number", unit: "وعده", filterable: false },
    { key: "decaf", label: "بدون کافئین", type: "boolean", filterable: true },
    { key: "origin", label: "کشور سازنده", type: "text", filterable: false },
  ],
  syrup: [
    { key: "flavor", label: "طعم", type: "text", filterable: false, required: true },
    {
      key: "volumeMl",
      label: "حجم",
      type: "number",
      unit: "میلی‌لیتر",
      filterable: true,
      required: true,
    },
    { key: "sugarFree", label: "بدون شکر", type: "boolean", filterable: true },
    { key: "origin", label: "کشور سازنده", type: "text", filterable: false },
  ],
  snack: [
    {
      key: "kind",
      label: "نوع",
      type: "enum",
      filterable: true,
      required: true,
      options: [
        { value: "chips", label: "چیپس و پفک" },
        { value: "biscuit", label: "بیسکویت و کوکی" },
        { value: "chocolate", label: "شکلات" },
        { value: "nuts", label: "آجیل و خشکبار" },
        { value: "other", label: "سایر" },
      ],
    },
    {
      key: "netWeightG",
      label: "وزن خالص",
      type: "number",
      unit: "گرم",
      filterable: true,
      required: true,
    },
    { key: "flavor", label: "طعم", type: "text", filterable: false },
    { key: "origin", label: "کشور سازنده", type: "text", filterable: false },
  ],
  noodle: [
    {
      key: "spice",
      label: "میزان تندی",
      type: "enum",
      filterable: true,
      required: true,
      options: [
        { value: "mild", label: "ملایم" },
        { value: "medium", label: "متوسط" },
        { value: "hot", label: "تند" },
        { value: "extra-hot", label: "خیلی تند" },
      ],
    },
    {
      key: "style",
      label: "نوع",
      type: "enum",
      filterable: true,
      options: [
        { value: "soup", label: "سوپی (آبکی)" },
        { value: "stir-fried", label: "خشک و سرخ‌شده" },
        { value: "cup", label: "لیوانی" },
      ],
    },
    {
      key: "netWeightG",
      label: "وزن خالص",
      type: "number",
      unit: "گرم",
      filterable: false,
      required: true,
    },
    { key: "flavor", label: "طعم", type: "text", filterable: false },
    { key: "origin", label: "کشور سازنده", type: "text", filterable: false },
  ],
  oliveOil: [
    {
      key: "grade",
      label: "درجه",
      type: "enum",
      filterable: true,
      required: true,
      options: [
        { value: "extra-virgin", label: "فرابکر" },
        { value: "virgin", label: "بکر" },
        { value: "pure", label: "خالص (پامیس)" },
      ],
    },
    {
      key: "volumeMl",
      label: "حجم",
      type: "number",
      unit: "میلی‌لیتر",
      filterable: true,
      required: true,
    },
    { key: "acidity", label: "اسیدیته", type: "number", unit: "درصد", filterable: false },
    {
      key: "packaging",
      label: "بسته‌بندی",
      type: "enum",
      filterable: true,
      options: [
        { value: "glass", label: "شیشه‌ای" },
        { value: "can", label: "حلب" },
        { value: "plastic", label: "پلاستیکی" },
      ],
    },
    { key: "origin", label: "کشور سازنده", type: "text", filterable: false },
  ],
  tea: [
    {
      key: "kind",
      label: "نوع چای",
      type: "enum",
      filterable: true,
      required: true,
      options: [
        { value: "black", label: "چای سیاه" },
        { value: "green", label: "چای سبز" },
        { value: "earl-grey", label: "ارل‌گری" },
        { value: "herbal", label: "دمنوش" },
        { value: "flavored", label: "چای طعم‌دار" },
      ],
    },
    {
      key: "form",
      label: "شکل",
      type: "enum",
      filterable: true,
      options: [
        { value: "bag", label: "کیسه‌ای" },
        { value: "leaf", label: "برگی (فله)" },
      ],
    },
    {
      key: "netWeightG",
      label: "وزن خالص",
      type: "number",
      unit: "گرم",
      filterable: true,
      required: true,
    },
    { key: "origin", label: "کشور سازنده", type: "text", filterable: false },
  ],
} as const satisfies Record<string, SpecSchema>;

/** نمایش مقدار مشخصه برای جدول مشخصات و کارت (FR-CAT-03). اعداد فارسی می‌شوند. */
export function formatSpecValue(
  field: SpecField,
  value: SpecValues[string] | undefined,
): string | null {
  if (value === undefined) return null;
  const faNum = (n: number) => n.toLocaleString("fa-IR");
  switch (field.type) {
    case "enum":
      return field.options.find((o) => o.value === value)?.label ?? String(value);
    case "number":
      return typeof value === "number"
        ? `${faNum(value)}${field.unit ? ` ${field.unit}` : ""}`
        : null;
    case "boolean":
      return value ? "دارد" : "ندارد";
    case "text":
      return String(value);
  }
}

/** چند مشخصه‌ی کلیدی برای روی کارت محصول: مقادیر «ندارد» حذف می‌شوند. */
export function specChips(schema: SpecSchema, values: SpecValues, max = 3): string[] {
  const out: string[] = [];
  for (const f of schema) {
    const v = values[f.key];
    if (v === undefined || v === false) continue;
    const text = f.type === "boolean" ? f.label : formatSpecValue(f, v);
    if (text) out.push(text);
    if (out.length >= max) break;
  }
  return out;
}
