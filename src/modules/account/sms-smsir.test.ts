import { describe, expect, it } from "vitest";
import { SmsIrError, smsIrSender } from "./sms-smsir";

const KEY = "SECRET-SMSIR-KEY";

function fakeFetch(reply: unknown, httpStatus = 200) {
  const calls: { url: string; headers: Record<string, string>; body: Record<string, unknown> }[] =
    [];
  const impl = (async (url: string, init?: RequestInit) => {
    calls.push({
      url,
      headers: init?.headers as Record<string, string>,
      body: JSON.parse(String(init?.body)),
    });
    return new Response(JSON.stringify(reply), { status: httpStatus });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe("SMS.ir", () => {
  it("کد ورود با قالب و پارامتر CODE", async () => {
    const f = fakeFetch({ status: 1, message: "موفق", data: { messageId: 1, cost: 1 } });
    await smsIrSender({ apiKey: KEY, otpTemplateId: 123456 }, f.impl).sendOtp(
      "09121234567",
      "48213",
    );
    expect(f.calls[0]!.url).toBe("https://api.sms.ir/v1/send/verify");
    expect(f.calls[0]!.headers["x-api-key"]).toBe(KEY);
    expect(f.calls[0]!.body).toEqual({
      mobile: "09121234567",
      templateId: 123456,
      parameters: [{ name: "CODE", value: "48213" }],
    });
  });

  it("پیامک سفارش با خط و فهرست یک‌نفره", async () => {
    const f = fakeFetch({ status: 1, data: { packId: "x", messageIds: [987], cost: 1 } });
    await smsIrSender(
      { apiKey: KEY, otpTemplateId: 1, lineNumber: "30007732000000" },
      f.impl,
    ).sendText("09121234567", "سفارش ۱۰۲۴ ارسال شد");
    expect(f.calls[0]!.url).toBe("https://api.sms.ir/v1/send/bulk");
    expect(f.calls[0]!.body).toEqual({
      lineNumber: 30007732000000,
      messageText: "سفارش ۱۰۲۴ ارسال شد",
      mobiles: ["09121234567"],
    });
  });

  it("لیست سیاه (۰) و شماره‌ی نامعتبر (null) خطا هستند", async () => {
    const s = (ids: unknown[]) =>
      smsIrSender(
        { apiKey: KEY, otpTemplateId: 1, lineNumber: "3000" },
        fakeFetch({ status: 1, data: { messageIds: ids } }).impl,
      ).sendText("0912", "x");
    const black = (await s([0]).catch((e: unknown) => e)) as SmsIrError;
    expect(black.status).toBe(115);
    const bad = (await s([null]).catch((e: unknown) => e)) as SmsIrError;
    expect(bad.status).toBe(104);
  });

  it("خطای وضعیت با توضیح فارسی و بدون کلید", async () => {
    const f = fakeFetch({ status: 102, message: "credit", data: null }, 400);
    const err = (await smsIrSender({ apiKey: KEY, otpTemplateId: 1 }, f.impl)
      .sendOtp("09121234567", "1")
      .catch((e: unknown) => e)) as SmsIrError;
    expect(err.status).toBe(102);
    expect(err.message).toMatch(/اعتبار/);
    expect(err.message).not.toMatch(/SECRET/);
  });

  it("بدون خط، پیامک سفارش خطای روشن می‌دهد؛ بدون کلید یا قالب ساخته نمی‌شود", async () => {
    const err = (await smsIrSender({ apiKey: KEY, otpTemplateId: 1 }, fakeFetch({}).impl)
      .sendText("0912", "x")
      .catch((e: unknown) => e)) as Error;
    expect(err.message).toMatch(/SMSIR_LINE_NUMBER/);
    expect(() => smsIrSender({ apiKey: "", otpTemplateId: 1 })).toThrow(/SMSIR_API_KEY/);
    expect(() => smsIrSender({ apiKey: KEY, otpTemplateId: Number.NaN })).toThrow(/TEMPLATE_ID/);
  });
});
