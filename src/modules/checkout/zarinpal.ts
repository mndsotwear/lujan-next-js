/**
 * زرین‌پال (D-023، D-065) — درگاه واقعی، نسخه‌ی ۴ API.
 * request ← کاربر به StartPay ← بازگشت به /api/payment/callback?Authority=…&Status=OK|NOK ← verify.
 * قیمت‌های سایت تومان‌اند و به زرین‌پال ریال (×۱۰، currency=IRR) فرستاده می‌شود تا ابهام واحد نماند.
 * حالت آزمایشی (sandbox) با ZARINPAL_SANDBOX=1؛ کد پذیرنده در sandbox هر UUID معتبری است.
 */
import type { PaymentGateway } from "./gateway";

export type ZarinpalConfig = { merchantId: string; sandbox?: boolean };
type Fetch = typeof fetch;

const HOSTS = {
  live: { api: "https://payment.zarinpal.com", pay: "https://payment.zarinpal.com" },
  sandbox: { api: "https://sandbox.zarinpal.com", pay: "https://sandbox.zarinpal.com" },
};

/** خطاهای پرتکرار، برای لاگ و پشتیبانی */
const CODES: Record<number, string> = {
  [-9]: "داده‌ی درخواست نامعتبر است",
  [-10]: "IP یا کد پذیرنده نامعتبر است",
  [-11]: "کد پذیرنده فعال نیست",
  [-12]: "تلاش بیش از حد؛ کمی بعد دوباره",
  [-15]: "درگاه پذیرنده تعلیق شده است",
  [-16]: "سطح تأیید پذیرنده کافی نیست",
  [-50]: "مبلغ تأیید با مبلغ پرداخت یکی نیست",
  [-51]: "پرداخت ناموفق بوده است",
  [-54]: "شناسه‌ی پرداخت (Authority) نامعتبر است",
};

export class ZarinpalError extends Error {
  constructor(
    readonly code: number,
    detail?: string,
  ) {
    super(`زرین‌پال ${code}: ${CODES[code] ?? detail ?? "خطای ناشناخته"}`);
    this.name = "ZarinpalError";
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const tomanToRial = (toman: number) => Math.round(toman) * 10;

type Reply = {
  data?: { code?: number; message?: string; authority?: string; ref_id?: number | string } | [];
  errors?: { code?: number; message?: string } | unknown[];
};

/** زرین‌پال گاهی errors را [] و گاهی {} برمی‌گرداند؛ data هم در خطا [] است */
function parse(r: Reply | null): { code: number; data: Exclude<Reply["data"], unknown[]> } {
  const err = r?.errors && !Array.isArray(r.errors) ? r.errors : undefined;
  if (err?.code) throw new ZarinpalError(err.code, err.message);
  const data = r?.data && !Array.isArray(r.data) ? r.data : undefined;
  if (!data?.code) throw new ZarinpalError(0, "پاسخ نامفهوم");
  return { code: data.code, data };
}

export function zarinpalGateway(cfg: ZarinpalConfig, fetchImpl: Fetch = fetch): PaymentGateway {
  if (!UUID.test(cfg.merchantId))
    throw new Error("ZARINPAL_MERCHANT_ID باید کد ۳۶ نویسه‌ای پذیرنده (UUID) باشد.");
  const host = cfg.sandbox ? HOSTS.sandbox : HOSTS.live;

  async function post(path: string, body: object): Promise<Reply | null> {
    let res: Response;
    try {
      res = await fetchImpl(`${host.api}/pg/v4/payment/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ merchant_id: cfg.merchantId, ...body }),
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
    } catch (e) {
      throw new Error(`زرین‌پال در دسترس نیست (${e instanceof Error ? e.name : "network"})`);
    }
    return (await res.json().catch(() => null)) as Reply | null;
  }

  return {
    name: "zarinpal",
    async request({ amount, description, callbackUrl, mobile }) {
      const { code, data } = parse(
        await post("request.json", {
          amount: tomanToRial(amount),
          currency: "IRR",
          description,
          callback_url: callbackUrl,
          metadata: { mobile },
        }),
      );
      if (code !== 100 || !data?.authority) throw new ZarinpalError(code, data?.message);
      return {
        authority: data.authority,
        redirectUrl: `${host.pay}/pg/StartPay/${encodeURIComponent(data.authority)}`,
      };
    },
    async verify({ authority, amount }) {
      try {
        const { code, data } = parse(
          await post("verify.json", { authority, amount: tomanToRial(amount) }),
        );
        // ۱۰۰ = تأیید شد، ۱۰۱ = قبلاً تأیید شده (بازگشت تکراری کاربر)
        if ((code === 100 || code === 101) && data?.ref_id != null)
          return { ok: true, refId: String(data.ref_id) };
        return { ok: false, reason: CODES[code] ?? `کد ${code}` };
      } catch (e) {
        // پاسخ قطعی زرین‌پال = ناموفق؛ قطع شبکه پرتاب می‌شود تا پرداخت «در انتظار» بماند و دوباره بررسی شود
        if (e instanceof ZarinpalError) return { ok: false, reason: e.message };
        throw e;
      }
    },
  };
}
