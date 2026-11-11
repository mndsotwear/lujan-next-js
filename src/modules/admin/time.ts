/** مرز روز و ماه شمسی در تهران (بدون ساعت تابستانی از ۱۴۰۱) — منطق خالص */
const TEHRAN_OFFSET_MS = 3.5 * 3_600_000;
const DAY = 86_400_000;

export function tehranDayStart(now = new Date()): Date {
  const local = now.getTime() + TEHRAN_OFFSET_MS;
  return new Date(Math.floor(local / DAY) * DAY - TEHRAN_OFFSET_MS);
}

/** روز چندم ماه شمسی (۱ تا ۳۱) در تهران */
export function persianDayOfMonth(now = new Date()): number {
  const d = new Intl.DateTimeFormat("en-u-ca-persian-nu-latn", {
    day: "numeric",
    timeZone: "Asia/Tehran",
  }).format(now);
  return Number(d);
}

export function persianMonthStart(now = new Date()): Date {
  return new Date(tehranDayStart(now).getTime() - (persianDayOfMonth(now) - 1) * DAY);
}
