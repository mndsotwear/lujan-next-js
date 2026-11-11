/**
 * تاریخ شمسی برای فرم‌های پنل (قرارداد پروژه: نمایش شمسی، ذخیره میلادی).
 * الگوریتم تبدیل جلالی/میلادی رایج (بازه‌ی سال‌های ۱۳۰۰ تا ۱۵۰۰ کافی است).
 */
import { toLatinDigits } from "./format";

const div = (a: number, b: number) => Math.trunc(a / b);

export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  jy += 1595;
  let days =
    -355668 +
    365 * jy +
    div(jy, 33) * 8 +
    div((jy % 33) + 3, 4) +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * div(days, 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * div(--days, 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    gy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const months = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 1; gm <= 12 && gd > months[gm]!; gm++) gd -= months[gm]!;
  return [gy, gm, gd];
}

/** «۱۴۰۵/۰۸/۲۰» ← لحظه‌ی شروع آن روز به وقت تهران؛ endOfDay برای پایان بازه */
export function parseJalali(input: string, endOfDay = false): Date | null {
  const m = toLatinDigits(input.trim()).match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (!m) return null;
  const [jy, jm, jd] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (
    jy < 1300 ||
    jy > 1500 ||
    jm < 1 ||
    jm > 12 ||
    jd < 1 ||
    jd > (jm <= 6 ? 31 : jm < 12 ? 30 : 30)
  )
    return null;
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  // تهران UTC+03:30
  const utc =
    Date.UTC(gy, gm - 1, gd, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0) -
    3.5 * 3_600_000;
  return new Date(utc);
}

/** تاریخ ← «1405/08/20» با ارقام لاتین برای فیلد فرم */
export function formatJalaliInput(d: Date | null | undefined): string {
  if (!d) return "";
  const parts = new Intl.DateTimeFormat("en-u-ca-persian-nu-latn", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tehran",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year").replace(/\D/g, "")}/${get("month")}/${get("day")}`;
}
