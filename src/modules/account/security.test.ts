import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { captchaRequired, checkChallenge, drawChallenge, newChallenge } from "./captcha";
import { pickClientIp } from "./client-ip";
import { deviceName } from "./device-name";
import { otpMessage } from "./otp-message";

const SECRET = "test-secret-0123456789-0123456789-abc";

/** پاسخ درست را مثل سرور از روی توکن پیدا می‌کند (فقط در تست، با کلید) */
function solve(token: string): number {
  const { n, h } = JSON.parse(Buffer.from(token.split(".")[0]!, "base64url").toString());
  for (let x = 0; x <= 30; x++)
    if (createHmac("sha256", `captcha:${SECRET}`).update(`${n}:${x}`).digest("base64url") === h)
      return x;
  throw new Error("no answer");
}

describe("امنیت ورود (D-022)", () => {
  it("IP: فقط مقدارهایی که پراکسی خودمان اضافه کرده", () => {
    // مهاجم خودش «1.1.1.1» را در سربرگ می‌گذارد؛ nginx IP واقعی را به انتها اضافه می‌کند
    expect(pickClientIp("1.1.1.1, 5.6.7.8", null, 1)).toBe("5.6.7.8");
    expect(pickClientIp("1.1.1.1, 5.6.7.8, 10.0.0.2", null, 2)).toBe("5.6.7.8");
    expect(pickClientIp("not-an-ip", "9.9.9.9", 1)).toBe("9.9.9.9");
    expect(pickClientIp("5.6.7.8", null, 0)).toBeNull();
    expect(pickClientIp(null, null, 1)).toBeNull();
  });

  it("پیامک کد: هشدار «به کسی ندهید» و خط WebOTP فقط روی دامنه‌ی واقعی", () => {
    const m = otpMessage("12345", "لوجان", "https://shop.example.ir");
    expect(m).toContain("12345");
    expect(m).toContain("به هیچ‌کس ندهید");
    expect(m.split("\n").at(-1)).toBe("@shop.example.ir #12345");
    expect(otpMessage("12345", "x", "http://localhost:3000")).not.toContain("@localhost");
  });

  it("کپچا فقط در رفتار مشکوک", () => {
    expect(captchaRequired(0, 0)).toBe(false);
    expect(captchaRequired(1, 2)).toBe(false);
    expect(captchaRequired(2, 0)).toBe(true);
    expect(captchaRequired(0, 3)).toBe(true);
  });

  it("کپچا: پاسخ درست یک‌بار، غلط هم توکن را می‌سوزاند، دست‌کاری و انقضا رد", () => {
    const now = Date.now();
    const a = newChallenge(SECRET, now);
    expect(checkChallenge(a.token, String(solve(a.token)), SECRET, now)).toBe(true);
    expect(checkChallenge(a.token, String(solve(a.token)), SECRET, now)).toBe(false);

    const b = newChallenge(SECRET, now);
    expect(checkChallenge(b.token, "999", SECRET, now)).toBe(false);
    expect(checkChallenge(b.token, String(solve(b.token)), SECRET, now)).toBe(false);

    const c = newChallenge(SECRET, now);
    const persian = String(solve(c.token)).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
    expect(checkChallenge(c.token, persian, SECRET, now)).toBe(true);

    const d = newChallenge(SECRET, now);
    expect(checkChallenge(d.token, String(solve(d.token)), SECRET, now + 6 * 60_000)).toBe(false);
    const e = newChallenge(SECRET, now);
    expect(checkChallenge(e.token.slice(0, -2) + "xx", String(solve(e.token)), SECRET, now)).toBe(
      false,
    );
    expect(
      checkChallenge(
        newChallenge("other-secret-0123456789-0123456789", now).token,
        "5",
        SECRET,
        now,
      ),
    ).toBe(false);
  });

  it("تصویر کپچا متن قابل خواندن ندارد", () => {
    const svg = drawChallenge("7 + 8");
    expect(svg).toMatch(/^<svg/);
    expect(svg).not.toMatch(/<text|7 \+ 8/);
  });

  it("نام دستگاه از User-Agent", () => {
    expect(
      deviceName(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("Safari — iOS");
    expect(
      deviceName(
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36",
      ),
    ).toBe("Chrome — Android");
    expect(deviceName(null)).toBe("—");
  });
});
