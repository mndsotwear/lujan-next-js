/** کدهای پشتیبان یک‌بارمصرف برای وقتی گوشی در دسترس نیست (D-035) */
import { createHmac, randomInt } from "node:crypto";

const CHARS = "abcdefghjkmnpqrstuvwxyz23456789"; // بدون نویسه‌های شبیه هم (l، 1، o، 0)

export function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () => {
    const s = Array.from({ length: 8 }, () => CHARS[randomInt(CHARS.length)]).join("");
    return `${s.slice(0, 4)}-${s.slice(4)}`;
  });
}

export const normalizeRecovery = (input: string) =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/^(.{4})(.{4})$/, "$1-$2");

export const hashRecovery = (code: string, secret: string) =>
  createHmac("sha256", secret)
    .update(`recovery:${normalizeRecovery(code)}`)
    .digest("hex");

/** کد درست است؟ اگر بله، فهرست بدون آن کد برمی‌گردد */
export function consumeRecoveryCode(
  input: string,
  hashes: string[],
  secret: string,
): string[] | null {
  const h = hashRecovery(input, secret);
  return hashes.includes(h) ? hashes.filter((x) => x !== h) : null;
}
