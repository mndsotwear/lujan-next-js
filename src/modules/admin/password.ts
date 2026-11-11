/**
 * رمز کارکنان (NFR-SEC-04، D-035): scrypt با نمک تصادفی؛ مقایسه‌ی زمان‌ثابت.
 */
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 32;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password.normalize("NFKC"), salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [alg, n, r, p, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = scryptSync(
    password.normalize("NFKC"),
    Buffer.from(salt, "base64"),
    expected.length,
    {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    },
  );
  return timingSafeEqual(actual, expected);
}

export type PasswordProblem = "short" | "long" | "weak" | "common" | "mobile";

const COMMON = [
  "password",
  "123456",
  "qwerty",
  "admin",
  "abc123",
  "111111",
  "iloveyou",
  "letmein",
  "welcome",
  "lujan",
];

/** رمز قوی: ۱۲ تا ۱۲۸ نویسه، دست‌کم ۶ نویسه‌ی متفاوت، نه رایج و نه شامل موبایل */
export function passwordProblems(password: string, mobile: string): PasswordProblem[] {
  const out: PasswordProblem[] = [];
  const pw = password.normalize("NFKC");
  if (pw.length < 12) out.push("short");
  if (pw.length > 128) out.push("long");
  if (new Set(pw).size < 6) out.push("weak");
  const lower = pw.toLowerCase();
  if (COMMON.some((c) => lower.includes(c))) out.push("common");
  if (mobile && (pw.includes(mobile) || pw.includes(mobile.slice(1)))) out.push("mobile");
  return out;
}
