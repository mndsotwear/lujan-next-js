/** اعتبارسنجی آدرس (FR-CHK-03) — مشترک بین حساب کاربری و تسویه حساب. */
import { toLatinDigits } from "@/lib/format";

/** ۳۱ استان ایران */
export const PROVINCES = [
  "آذربایجان شرقی",
  "آذربایجان غربی",
  "اردبیل",
  "اصفهان",
  "البرز",
  "ایلام",
  "بوشهر",
  "تهران",
  "چهارمحال و بختیاری",
  "خراسان جنوبی",
  "خراسان رضوی",
  "خراسان شمالی",
  "خوزستان",
  "زنجان",
  "سمنان",
  "سیستان و بلوچستان",
  "فارس",
  "قزوین",
  "قم",
  "کردستان",
  "کرمان",
  "کرمانشاه",
  "کهگیلویه و بویراحمد",
  "گلستان",
  "گیلان",
  "لرستان",
  "مازندران",
  "مرکزی",
  "هرمزگان",
  "همدان",
  "یزد",
] as const;

export type AddressInput = {
  title?: string;
  province: string;
  city: string;
  postalCode: string;
  line: string;
  recipient: string;
  phone: string;
};
export type AddressErrors = Partial<Record<keyof AddressInput, string>>;

export const normalizePostalCode = (v: string) => toLatinDigits(v).replace(/[\s-]/g, "");

/**
 * کد پستی ایران: ۱۰ رقم. قواعد ریزتر (کدام رقم کجا مجاز است) تا تأیید از منبع رسمی پست اعمال نمی‌شود
 * تا کد پستی واقعی مشتری رد نشود؛ فقط ۱۰ رقم و نه همه یکسان.
 */
export function isValidPostalCode(v: string): boolean {
  const p = normalizePostalCode(v);
  return /^\d{10}$/.test(p) && !/^(\d)\1{9}$/.test(p);
}

/** تلفن گیرنده (همراه یا ثابت با پیش‌شماره): ارقام فارسی، فاصله، خط تیره، +98 و 0098 ← «0xxxxxxxxxx» */
export function normalizePhone(input: string): string {
  const p = toLatinDigits(input).replace(/[\s\-()]/g, "");
  if (p.startsWith("+98")) return "0" + p.slice(3);
  if (p.startsWith("0098")) return "0" + p.slice(4);
  return p;
}

export function validateAddress(a: AddressInput): AddressErrors {
  const e: AddressErrors = {};
  if (!(PROVINCES as readonly string[]).includes(a.province)) e.province = "استان را انتخاب کنید.";
  if (a.city.trim().length < 2) e.city = "شهر را بنویسید.";
  if (!isValidPostalCode(a.postalCode)) e.postalCode = "کد پستی باید ۱۰ رقم باشد.";
  if (a.line.trim().length < 10) e.line = "نشانی کامل را بنویسید (خیابان، کوچه، پلاک، واحد).";
  if (a.recipient.trim().length < 3) e.recipient = "نام گیرنده را بنویسید.";
  if (!/^0\d{10}$/.test(normalizePhone(a.phone))) e.phone = "شماره تماس گیرنده باید ۱۱ رقم باشد.";
  return e;
}
