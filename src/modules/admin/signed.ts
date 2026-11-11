/** توکن کوتاه‌مدت امضاشده برای مرحله‌ی بین رمز و کد (و فعال‌سازی) — در کوکی httpOnly */
import { createHmac, timingSafeEqual } from "node:crypto";

export function signToken(payload: Record<string, string | number>, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

/** امضا درست و exp (میلی‌ثانیه) نگذشته باشد */
export function readToken<T extends { exp: number }>(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): T | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest();
  const actual = Buffer.from(sig, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString()) as T;
    return typeof data.exp === "number" && data.exp > now ? data : null;
  } catch {
    return null;
  }
}
