/** شماره موبایل ایران: ورودی با ارقام فارسی/عربی، فاصله، خط تیره، +98 یا 0098 ← «09xxxxxxxxx» */
import { toLatinDigits } from "@/lib/format";

export function normalizeMobile(input: string): string | null {
  let m = toLatinDigits(input).replace(/[\s\-()]/g, "");
  if (m.startsWith("+98")) m = "0" + m.slice(3);
  else if (m.startsWith("0098")) m = "0" + m.slice(4);
  else if (/^9\d{9}$/.test(m)) m = "0" + m;
  return /^09\d{9}$/.test(m) ? m : null;
}

/** نمایش ۰۹۱۲ ۳۴۵ ۶۷۸۹ */
export function formatMobile(m: string): string {
  const d = m.replace(/\D/g, "");
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`.replace(
    /\d/g,
    (c) => "۰۱۲۳۴۵۶۷۸۹"[Number(c)]!,
  );
}

/** پنهان‌کردن وسط شماره برای لاگ (NFR-SEC-09): 0912***6789 */
export const maskMobile = (m: string) => `${m.slice(0, 4)}***${m.slice(-4)}`;
