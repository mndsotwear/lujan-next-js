import { describe, expect, it } from "vitest";
import { ZarinpalError, tomanToRial, zarinpalGateway } from "./zarinpal";

const MID = "1344b5d4-0048-11e8-94db-005056a205be";

function fakeFetch(...replies: unknown[]) {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const impl = (async (url: string, init?: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init?.body)) });
    return new Response(JSON.stringify(replies[calls.length - 1]), { status: 200 });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const req = {
  amount: 1_250_000,
  description: "سفارش ۱۰۲۴",
  callbackUrl: "https://x.ir/cb",
  mobile: "09121234567",
};

describe("زرین‌پال", () => {
  it("تومان به ریال", () => expect(tomanToRial(1_250_000)).toBe(12_500_000));

  it("درخواست پرداخت: ریال، callback، StartPay", async () => {
    const f = fakeFetch({
      data: { code: 100, message: "Success", authority: "A0000000000000000000000000000abcd" },
      errors: [],
    });
    const r = await zarinpalGateway({ merchantId: MID }, f.impl).request(req);
    expect(f.calls[0]!.url).toBe("https://payment.zarinpal.com/pg/v4/payment/request.json");
    expect(f.calls[0]!.body).toMatchObject({
      merchant_id: MID,
      amount: 12_500_000,
      currency: "IRR",
      callback_url: "https://x.ir/cb",
      metadata: { mobile: "09121234567" },
    });
    expect(r.authority).toBe("A0000000000000000000000000000abcd");
    expect(r.redirectUrl).toBe(
      "https://payment.zarinpal.com/pg/StartPay/A0000000000000000000000000000abcd",
    );
  });

  it("حالت آزمایشی روی sandbox", async () => {
    const f = fakeFetch({ data: { code: 100, authority: "S1" }, errors: [] });
    const r = await zarinpalGateway({ merchantId: MID, sandbox: true }, f.impl).request(req);
    expect(f.calls[0]!.url.startsWith("https://sandbox.zarinpal.com/")).toBe(true);
    expect(r.redirectUrl.startsWith("https://sandbox.zarinpal.com/pg/StartPay/")).toBe(true);
  });

  it("خطای درخواست پرتاب می‌شود", async () => {
    const f = fakeFetch({ data: [], errors: { code: -10, message: "ip", validations: [] } });
    const err = await zarinpalGateway({ merchantId: MID }, f.impl)
      .request(req)
      .catch((e) => e);
    expect(err).toBeInstanceOf(ZarinpalError);
    expect((err as ZarinpalError).code).toBe(-10);
  });

  it("تأیید: ۱۰۰ و ۱۰۱ موفق با شماره‌ی مرجع، مبلغ به ریال", async () => {
    const f = fakeFetch(
      { data: { code: 100, ref_id: 201, card_pan: "502229******5995" }, errors: [] },
      { data: { code: 101, ref_id: 201 }, errors: [] },
    );
    const g = zarinpalGateway({ merchantId: MID }, f.impl);
    expect(await g.verify({ authority: "A1", amount: 1_250_000 })).toEqual({
      ok: true,
      refId: "201",
    });
    expect(f.calls[0]!.body).toMatchObject({ authority: "A1", amount: 12_500_000 });
    expect(await g.verify({ authority: "A1", amount: 1_250_000 })).toEqual({
      ok: true,
      refId: "201",
    });
  });

  it("تأیید ناموفق قطعی = ok:false؛ قطع شبکه پرتاب می‌شود (پرداخت در انتظار می‌ماند)", async () => {
    const f = fakeFetch({ data: [], errors: { code: -51, message: "failed" } });
    const r = await zarinpalGateway({ merchantId: MID }, f.impl).verify({
      authority: "A1",
      amount: 1000,
    });
    expect(r.ok).toBe(false);
    const down = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    await expect(
      zarinpalGateway({ merchantId: MID }, down).verify({ authority: "A1", amount: 1000 }),
    ).rejects.toThrow(/در دسترس نیست/);
  });

  it("کد پذیرنده باید UUID باشد", () => {
    expect(() => zarinpalGateway({ merchantId: "abc" })).toThrow(/ZARINPAL_MERCHANT_ID/);
  });
});
