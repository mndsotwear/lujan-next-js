/** یادآوری سبد رهاشده با پیامک — منطق خالص (FR: پیشنهاد مالک) */

export const ABANDONED_AFTER_MS = 3 * 60 * 60 * 1000; // ۳ ساعت پس از آخرین تغییر سبد
export const ABANDONED_MAX_AGE_MS = 48 * 60 * 60 * 1000; // سبدهای قدیمی‌تر از ۲ روز نه
/** فقط بین ۹ صبح تا ۹ شب به وقت تهران */
export const QUIET = { from: 9, to: 21 };

export const tehranHour = (d: Date) =>
  Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tehran",
      hour: "numeric",
      hourCycle: "h23",
    }).format(d),
  );

export type AbandonedCandidate = {
  hasUser: boolean;
  itemCount: number;
  lastActivity: Date;
  remindedAt: Date | null;
  orderedSince: boolean;
};

export function shouldRemind(c: AbandonedCandidate, now = new Date()): boolean {
  if (!c.hasUser || c.itemCount < 1 || c.orderedSince) return false;
  const age = now.getTime() - c.lastActivity.getTime();
  if (age < ABANDONED_AFTER_MS || age > ABANDONED_MAX_AGE_MS) return false;
  // برای هر سبد یک بار؛ اگر بعد از یادآوری کالایی اضافه شد، دوباره مجاز است
  if (c.remindedAt && c.remindedAt >= c.lastActivity) return false;
  const h = tehranHour(now);
  return h >= QUIET.from && h < QUIET.to;
}

export const reminderText = (siteName: string, siteUrl: string, name: string | null) =>
  `${name ? `${name} عزیز، ` : ""}کالاهای انتخابی شما در سبد خرید ${siteName} منتظرتان است. تکمیل خرید: ${siteUrl}/cart\nلغو۱۱`;
