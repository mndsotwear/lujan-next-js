/**
 * IP واقعی بازدیدکننده (D-022 بند ۱) — منطق خالص.
 * X-Forwarded-For را هر کسی می‌تواند بفرستد؛ فقط n مقدار آخر را پراکسی‌های خودمان (nginx) اضافه کرده‌اند.
 * TRUSTED_PROXY_HOPS = تعداد پراکسی‌های ما جلوی سایت (پیش‌فرض ۱: nginx). ۰ = به سربرگ‌ها اعتماد نکن.
 */
import { isIP } from "node:net";

export function pickClientIp(
  forwardedFor: string | null,
  realIp: string | null,
  hops: number,
): string | null {
  if (hops <= 0) return null;
  if (forwardedFor) {
    const parts = forwardedFor
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    // پراکسی ما IP اتصال را به انتها اضافه می‌کند؛ مقدارهای قبلی از خود درخواست‌کننده‌اند
    const ip = parts[parts.length - hops];
    if (ip && isIP(ip)) return ip;
  }
  const r = realIp?.trim();
  return r && isIP(r) ? r : null;
}

export const trustedHops = () => {
  const n = Number(process.env.TRUSTED_PROXY_HOPS ?? "1");
  return Number.isInteger(n) && n >= 0 && n <= 5 ? n : 1;
};
