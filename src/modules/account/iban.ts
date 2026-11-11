/**
 * شماره‌ی شبا برای بازپرداخت (D-038، D-041): IR + ۲۴ رقم با رقم کنترل ISO 13616 (mod 97).
 */
import { toLatinDigits } from "@/lib/format";

/** ارقام فارسی، فاصله و خط تیره را پاک می‌کند؛ ۲۴ رقم بدون IR هم پذیرفته می‌شود */
export function normalizeIban(input: string): string {
  const s = toLatinDigits(input)
    .replace(/[\s\-]/g, "")
    .toUpperCase();
  return /^\d{24}$/.test(s) ? `IR${s}` : s;
}

export function isValidIban(iban: string): boolean {
  if (!/^IR\d{24}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + "1827" + iban.slice(2, 4); // I=18، R=27
  let rem = 0;
  for (const ch of rearranged) rem = (rem * 10 + Number(ch)) % 97;
  return rem === 1;
}

/** نمایش امن: IR66 **** **** **** **** 1234 */
export const maskIban = (iban: string) => `${iban.slice(0, 4)} •••• ${iban.slice(-4)}`;

/** نمایش کامل گروه‌بندی‌شده برای کپی اپراتور */
export const groupIban = (iban: string) => iban.replace(/(.{4})/g, "$1 ").trim();
