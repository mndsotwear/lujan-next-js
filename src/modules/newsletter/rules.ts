/** خبرنامه‌ی پیامکی و ایمیلی با رضایت صریح (FR-MKT-01، D-055) — منطق خالص */
import { toLatinDigits } from "@/lib/format";
import { normalizeMobile } from "@/modules/account";

export type Channel = "SMS" | "EMAIL";
export type Contact = { channel: Channel; address: string };

const EMAIL = /^[^\s@<>()",;:]{1,64}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9-]{1,63})+$/;

export function normalizeEmail(input: string): string | null {
  const e = input.trim().toLowerCase();
  return e.length <= 254 && EMAIL.test(e) ? e : null;
}

/** ورودی فوتر: موبایل یا ایمیل */
export function parseContact(input: string): Contact | null {
  const s = input.trim();
  if (s.includes("@")) {
    const e = normalizeEmail(s);
    return e ? { channel: "EMAIL", address: e } : null;
  }
  const m = normalizeMobile(s);
  return m ? { channel: "SMS", address: m } : null;
}

/** پیامک «لغو۱» (و گونه‌های رایج: لغو 1، لغو ۱، لغو، stop) */
export function isOptOutText(text: string): boolean {
  const t = toLatinDigits(text)
    .replace(/[\s‌]+/g, "")
    .toLowerCase();
  return /^(لغو1?|لغو|stop|unsubscribe|off)$/.test(t);
}

/** متن پایانی هر پیامک تبلیغاتی (D-055) */
export const SMS_OPT_OUT_FOOTER = "لغو۱";

/** پنهان‌سازی برای فهرست پنل */
export function maskAddress(c: Contact): string {
  if (c.channel === "SMS") return `${c.address.slice(0, 4)}***${c.address.slice(-4)}`;
  const [u = "", d = ""] = c.address.split("@");
  return `${u.slice(0, 2)}***@${d}`;
}
