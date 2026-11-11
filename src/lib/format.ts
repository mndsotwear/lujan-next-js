/**
 * قالب‌بندی اعداد و قیمت — قانون پروژه: «اعداد فارسی در نمایش، انگلیسی در داده»
 * و «تومان، عدد صحیح بدون اعشار» (بخش ۲-۶ و CLAUDE.md).
 */

const faNumber = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });

/** عدد را با ارقام و جداکننده‌ی فارسی نمایش می‌دهد: 4250000 → «۴٬۲۵۰٬۰۰۰» */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) throw new RangeError(`عدد نامعتبر: ${value}`);
  return faNumber.format(value);
}

/** قیمت تومانی: 4250000 → «۴٬۲۵۰٬۰۰۰ تومان». فقط عدد صحیح نامنفی پذیرفته می‌شود. */
export function formatToman(amount: number): string {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new RangeError(`مبلغ تومان باید عدد صحیح نامنفی باشد: ${amount}`);
  }
  return `${faNumber.format(amount)} تومان`;
}

/** تبدیل تومان به ریال برای فاکتور رسمی (FR-CHK-09). */
export function tomanToRial(amount: number): number {
  return amount * 10;
}

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/**
 * ورودی کاربر (موبایل، کد پستی، OTP) را به ارقام انگلیسی برمی‌گرداند تا در داده ذخیره شود.
 * ارقام فارسی و عربی هر دو پشتیبانی می‌شوند (FR-SRCH-02).
 */
export function toLatinDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (d) => {
    const fa = FA_DIGITS.indexOf(d);
    return String(fa >= 0 ? fa : AR_DIGITS.indexOf(d));
  });
}

/** ارقام انگلیسی داخل متن را فارسی می‌کند (برای متن‌هایی که از داده می‌آیند). */
export function toPersianDigits(input: string): string {
  return input.replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)] ?? d);
}

/** شماره‌ی سفارش بدون جداکننده‌ی هزارگان: 1001 → «۱۰۰۱» */
export function formatOrderNumber(n: number): string {
  return n.toLocaleString("fa-IR", { useGrouping: false });
}
