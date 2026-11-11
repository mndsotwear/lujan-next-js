/**
 * کد ۶ رقمی اپ کدساز (TOTP، RFC 6238 با HMAC-SHA1، بازه‌ی ۳۰ ثانیه) — سازگار با Google Authenticator و مشابه.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP = 30;
const DIGITS = 6;

export function base32Encode(buf: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const c of clean) {
    value = (value << 5) | ALPHABET.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export const generateTotpSecret = () => base32Encode(randomBytes(20));

export const counterAt = (ms: number) => Math.floor(ms / 1000 / STEP);

export function hotp(secret: string, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", base32Decode(secret)).update(msg).digest();
  const offset = h[h.length - 1]! & 0x0f;
  const code = (h.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGITS;
  return String(code).padStart(DIGITS, "0");
}

/**
 * بررسی کد با تحمل ±۱ بازه برای اختلاف ساعت گوشی.
 * کدی که شمارنده‌اش ≤ آخرین کد پذیرفته‌شده باشد رد می‌شود (جلوگیری از استفاده‌ی دوباره).
 * خروجی: شمارنده‌ی پذیرفته‌شده یا null.
 */
export function verifyTotp(
  secret: string,
  code: string,
  now = Date.now(),
  lastCounter: number | null = null,
): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const c = counterAt(now);
  for (const k of [c - 1, c, c + 1]) {
    if (lastCounter !== null && k <= lastCounter) continue;
    const a = Buffer.from(hotp(secret, k));
    if (timingSafeEqual(a, Buffer.from(code))) return k;
  }
  return null;
}

/** نشانی برای کد QR اپ کدساز */
export function otpauthUri(issuer: string, account: string, secret: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP}`;
}
