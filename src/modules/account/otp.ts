/**
 * کد یکبارمصرف (FR-ACC-01) و محدودیت نرخ (NFR-SEC-05) — منطق خالص.
 * کد ۵ رقمی، ۲ دقیقه اعتبار، حداکثر ۵ تلاش؛ فقط هش (HMAC-SHA256) ذخیره می‌شود.
 */
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { OTP as PUBLIC } from "./otp-config";

export const OTP = {
  length: PUBLIC.length,
  ttlMs: 2 * 60_000,
  maxAttempts: 5,
  resendAfterMs: PUBLIC.resendAfterSec * 1000, // حداقل فاصله‌ی دو ارسال به یک شماره
  perMobilePerHour: 5,
  perIpPerHour: 15,
} as const;

export function generateCode(): string {
  return String(randomInt(0, 10 ** OTP.length)).padStart(OTP.length, "0");
}

export function hashCode(code: string, mobile: string, secret: string): string {
  return createHmac("sha256", secret).update(`${mobile}:${code}`).digest("hex");
}

export function verifyCode(input: string, mobile: string, hash: string, secret: string): boolean {
  const a = Buffer.from(hashCode(input, mobile, secret), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export type SendDecision =
  | { ok: true }
  | { ok: false; reason: "wait"; retryInSec: number }
  | { ok: false; reason: "too_many" };

/** آیا می‌توان کد تازه فرستاد؟ ورودی: زمان ارسال‌های یک ساعت اخیر به این شماره و از این IP. */
export function canSend(mobileSends: Date[], ipSends: Date[], now = new Date()): SendDecision {
  const hourAgo = now.getTime() - 3_600_000;
  const recentMobile = mobileSends.filter((d) => d.getTime() > hourAgo);
  const recentIp = ipSends.filter((d) => d.getTime() > hourAgo);
  if (recentMobile.length >= OTP.perMobilePerHour || recentIp.length >= OTP.perIpPerHour)
    return { ok: false, reason: "too_many" };
  const last = Math.max(0, ...recentMobile.map((d) => d.getTime()));
  const wait = last + OTP.resendAfterMs - now.getTime();
  if (wait > 0) return { ok: false, reason: "wait", retryInSec: Math.ceil(wait / 1000) };
  return { ok: true };
}
