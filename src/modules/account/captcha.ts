/**
 * کپچای ساده و خودمیزبان (D-022 بند ۴، D-059) — فقط وقتی رفتار مشکوک است (ارسال‌های پیاپی کد).
 * بدون سرویس خارجی (reCAPTCHA از ایران در دسترس نیست). جمع دو عدد که به‌صورت خط‌های
 * شکسته‌ی تصادفی کشیده می‌شوند (نه متن قابل خواندن در SVG). کنار محدودیت نرخ، فقط سد سرعت است.
 */
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { toLatinDigits } from "@/lib/format";

const TTL_MS = 5 * 60_000;
const used = new Map<string, number>(); // nonce ← زمان انقضا (جلوی استفاده‌ی دوباره)

/** قانون نیاز به کپچا: از سومین درخواست از یک IP یا دومین درخواست برای یک شماره در یک ساعت */
export function captchaRequired(sendsByMobile: number, sendsByIp: number): boolean {
  return sendsByMobile >= 2 || sendsByIp >= 3;
}

const sign = (secret: string, data: string) =>
  createHmac("sha256", `captcha:${secret}`).update(data).digest("base64url");

// ───────── رسم ─────────
// ۷ قطعه: a بالا، b راست‌بالا، c راست‌پایین، d پایین، e چپ‌پایین، f چپ‌بالا، g وسط
const SEGMENTS: Record<string, string> = {
  "0": "abcdef",
  "1": "bc",
  "2": "abged",
  "3": "abgcd",
  "4": "fgbc",
  "5": "afgcd",
  "6": "afgedc",
  "7": "abc",
  "8": "abcdefg",
  "9": "abcdfg",
};
const SEG_LINES: Record<string, [number, number, number, number]> = {
  a: [0, 0, 1, 0],
  b: [1, 0, 1, 1],
  c: [1, 1, 1, 2],
  d: [0, 2, 1, 2],
  e: [0, 1, 0, 2],
  f: [0, 0, 0, 1],
  g: [0, 1, 1, 1],
};
// جابه‌جایی کم: خوانا برای آدم، ولی خط‌ها هر بار متفاوت
const j = (n: number) => n + (randomInt(0, 5) - 2);

function glyph(ch: string, x: number, y: number, w: number, h: number): string[] {
  if (ch === "+") {
    const cx = x + w / 2;
    const cy = y + h;
    return [
      `M${j(cx - 12)} ${j(cy)} L${j(cx + 12)} ${j(cy)}`,
      `M${j(cx)} ${j(cy - 12)} L${j(cx)} ${j(cy + 12)}`,
    ];
  }
  const skew = randomInt(-3, 4);
  return [...(SEGMENTS[ch] ?? "")].map((s) => {
    const [x1, y1, x2, y2] = SEG_LINES[s]!;
    const px = (gx: number, gy: number) => x + gx * w + (2 - gy) * skew * 0.5;
    const py = (gy: number) => y + gy * h;
    // نقطه‌ی میانی جابه‌جا تا خط صاف و قابل تطبیق ساده نباشد
    const mx = (px(x1, y1) + px(x2, y2)) / 2;
    const my = (py(y1) + py(y2)) / 2;
    return `M${j(px(x1, y1))} ${j(py(y1))} Q${j(mx)} ${j(my)} ${j(px(x2, y2))} ${j(py(y2))}`;
  });
}

export function drawChallenge(text: string): string {
  const W = 220;
  const H = 80;
  const paths: string[] = [];
  let x = 18;
  for (const ch of text) {
    if (ch === " ") {
      x += 10;
      continue;
    }
    const w = ch === "+" ? 30 : randomInt(22, 27);
    paths.push(...glyph(ch, x, randomInt(10, 16), w, randomInt(24, 28)));
    x += w + randomInt(12, 18);
  }
  const noise = Array.from({ length: 4 }, () => {
    const y1 = randomInt(5, H - 5);
    return `M${randomInt(0, 30)} ${y1} C${randomInt(40, 90)} ${randomInt(0, H)} ${randomInt(120, 180)} ${randomInt(0, H)} ${randomInt(190, W)} ${randomInt(5, H - 5)}`;
  });
  const dots = Array.from(
    { length: 30 },
    () => `<circle cx="${randomInt(0, W)}" cy="${randomInt(0, H)}" r="${randomInt(1, 3)}"/>`,
  ).join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    `<rect width="100%" height="100%" fill="#f4f2ee"/>` +
    `<g fill="#8b8f93" opacity=".5">${dots}</g>` +
    `<path d="${noise.join(" ")}" stroke="#8b8f93" stroke-width="1" fill="none" opacity=".6"/>` +
    `<path d="${paths.join(" ")}" stroke="#1c1f22" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
    `</svg>`
  );
}

// ───────── چالش و بررسی ─────────
export function newChallenge(secret: string, now = Date.now()): { token: string; svg: string } {
  const a = randomInt(2, 10);
  const b = randomInt(1, 10);
  const n = randomBytes(12).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({ n, h: sign(secret, `${n}:${a + b}`), exp: now + TTL_MS }),
  ).toString("base64url");
  return { token: `${body}.${sign(secret, body)}`, svg: drawChallenge(`${a} + ${b}`) };
}

export function checkChallenge(
  token: string,
  answer: string,
  secret: string,
  now = Date.now(),
): boolean {
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  const want = Buffer.from(sign(secret, body));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return false;
  let data: { n: string; h: string; exp: number };
  try {
    data = JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return false;
  }
  if (!data.n || data.exp < now || used.has(data.n)) return false;
  const value = toLatinDigits(answer).replace(/\s+/g, "");
  if (!/^\d{1,3}$/.test(value)) return false;
  const ok = sign(secret, `${data.n}:${Number(value)}`) === data.h;
  // پاسخ غلط هم چالش را می‌سوزاند تا حدس پیاپی ممکن نباشد
  used.set(data.n, data.exp);
  if (used.size > 5000) for (const [k, exp] of used) if (exp < now) used.delete(k);
  return ok;
}
