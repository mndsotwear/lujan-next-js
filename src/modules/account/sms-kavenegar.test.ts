import { describe, expect, it } from "vitest";
import { KavenegarError, kavenegarSender } from "./sms-kavenegar";

const KEY = "SECRET-API-KEY-123";

function fakeFetch(reply: unknown, httpStatus = 200) {
  const calls: { url: string; body: URLSearchParams }[] = [];
  const impl = (async (url: string, init?: RequestInit) => {
    calls.push({ url, body: new URLSearchParams(String(init?.body ?? "")) });
    return new Response(JSON.stringify(reply), { status: httpStatus });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const ok = { return: { status: 200, message: "تایید شد" }, entries: [] };

describe("کاوه‌نگار", () => {
  it("کد ورود با قالب و توکن (ارسال سریع) می‌رود", async () => {
    const f = fakeFetch(ok);
    await kavenegarSender({ apiKey: KEY, otpTemplate: "login-otp" }, f.impl).sendOtp(
      "09121234567",
      "48213",
    );
    expect(f.calls[0]!.url).toBe(`https://api.kavenegar.com/v1/${KEY}/verify/lookup.json`);
    expect(f.calls[0]!.body.get("receptor")).toBe("09121234567");
    expect(f.calls[0]!.body.get("token")).toBe("48213");
    expect(f.calls[0]!.body.get("template")).toBe("login-otp");
  });

  it("پیامک عادی با خط فرستنده، و بدون آن روی خط پیش‌فرض", async () => {
    const f = fakeFetch(ok);
    await kavenegarSender({ apiKey: KEY, otpTemplate: "t", sender: "10008663" }, f.impl).sendText(
      "09121234567",
      "سفارش ۱۰۲۴ ارسال شد",
    );
    expect(f.calls[0]!.url.endsWith("/sms/send.json")).toBe(true);
    expect(f.calls[0]!.body.get("message")).toBe("سفارش ۱۰۲۴ ارسال شد");
    expect(f.calls[0]!.body.get("sender")).toBe("10008663");
    const g = fakeFetch(ok);
    await kavenegarSender({ apiKey: KEY, otpTemplate: "t" }, g.impl).sendText("0912", "x");
    expect(g.calls[0]!.body.has("sender")).toBe(false);
  });

  it("خطای کاوه‌نگار با توضیح فارسی و بدون کلید API", async () => {
    const f = fakeFetch({ return: { status: 418, message: "credit" } }, 418);
    const s = kavenegarSender({ apiKey: KEY, otpTemplate: "t" }, f.impl);
    const err = await s.sendOtp("09121234567", "11111").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(KavenegarError);
    expect((err as KavenegarError).status).toBe(418);
    expect((err as Error).message).toMatch(/اعتبار/);
    expect((err as Error).message).not.toMatch(/SECRET/);
  });

  it("قطع شبکه: پیام بدون نشانی و کلید", async () => {
    const boom = (async () => {
      throw new TypeError(`fetch failed https://api.kavenegar.com/v1/${KEY}/sms/send.json`);
    }) as unknown as typeof fetch;
    const err = await kavenegarSender({ apiKey: KEY, otpTemplate: "t" }, boom)
      .sendText("09121234567", "x")
      .catch((e: unknown) => e as Error);
    expect((err as Error).message).not.toMatch(/SECRET/);
  });

  it("بدون کلید یا قالب ساخته نمی‌شود", () => {
    expect(() => kavenegarSender({ apiKey: "", otpTemplate: "t" })).toThrow(/KAVENEGAR_API_KEY/);
    expect(() => kavenegarSender({ apiKey: KEY, otpTemplate: "" })).toThrow(/OTP_TEMPLATE/);
  });
});
