/**
 * SMS.ir (D-064) — ارسال واقعی پیامک، API نسخه‌ی ۱ (https://api.sms.ir/v1، سربرگ X-API-KEY).
 * کد ورود با «ارسال سریع» (send/verify) و قالبی که در پنل SMS.ir ثبت و تأیید شده می‌رود:
 * این مسیر روی خط خدماتی است و به لیست سیاه مخابرات نمی‌خورد.
 * اعلان‌های سفارش و موجودی با send/bulk و شماره‌ی خط شما می‌روند.
 */
import type { SmsSender } from "./sms";

export type SmsIrConfig = {
  apiKey: string;
  /** شناسه‌ی عددی قالب کد ورود در پنل (بخش ارسال سریع) */
  otpTemplateId: number;
  /** نام پارامتر کد در قالب، بدون # (مثلاً CODE برای #CODE#) */
  otpParam?: string;
  /** شماره‌ی خط برای پیامک‌های عادی (اعلان سفارش)؛ بدون آن فقط کد ورود فرستاده می‌شود */
  lineNumber?: string;
};

type Fetch = typeof fetch;

/** کدهای وضعیت SMS.ir (مستندات رسمی REST API) */
const STATUS: Record<number, string> = {
  0: "خطای سامانه‌ی SMS.ir",
  10: "کلید وب‌سرویس نامعتبر است",
  11: "کلید وب‌سرویس غیرفعال است",
  12: "کلید فقط برای IPهای تعریف‌شده مجاز است (IP سرور را در پنل اضافه کنید)",
  13: "حساب کاربری غیرفعال است",
  14: "حساب کاربری تعلیق شده است",
  20: "تعداد درخواست بیش از حد مجاز",
  101: "شماره‌ی خط نامعتبر است",
  102: "اعتبار حساب کافی نیست",
  103: "متن پیام خالی است",
  104: "شماره‌ی موبایل نامعتبر است",
  113: "قالب پیدا نشد",
  114: "مقدار پارامتر بیش از ۲۵ نویسه است",
  115: "شماره در لیست سیاه است",
  117: "متن پیام تأیید نشده است",
  118: "تعداد پیام بیش از حد مجاز",
};

export class SmsIrError extends Error {
  constructor(
    readonly status: number,
    detail?: string,
  ) {
    super(`SMS.ir ${status}: ${STATUS[status] ?? detail ?? "خطای ناشناخته"}`);
    this.name = "SmsIrError";
  }
}

const BASE = "https://api.sms.ir/v1";

export function smsIrSender(cfg: SmsIrConfig, fetchImpl: Fetch = fetch): SmsSender {
  if (!cfg.apiKey) throw new Error("SMSIR_API_KEY تنظیم نشده است.");
  if (!Number.isSafeInteger(cfg.otpTemplateId) || cfg.otpTemplateId <= 0)
    throw new Error("SMSIR_OTP_TEMPLATE_ID باید شناسه‌ی عددی قالب باشد.");
  const param = cfg.otpParam || "CODE";

  async function post<T>(path: string, body: object): Promise<T> {
    let res: Response;
    try {
      res = await fetchImpl(`${BASE}/${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          "x-api-key": cfg.apiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
    } catch (e) {
      throw new Error(`SMS.ir در دسترس نیست (${e instanceof Error ? e.name : "network"})`);
    }
    const r = (await res.json().catch(() => null)) as {
      status?: number;
      message?: string;
      data?: T;
    } | null;
    if (r?.status !== 1) throw new SmsIrError(r?.status ?? res.status, r?.message);
    return r.data as T;
  }

  return {
    async sendOtp(mobile, code) {
      await post("send/verify", {
        mobile,
        templateId: cfg.otpTemplateId,
        parameters: [{ name: param, value: code }],
      });
    },
    async sendText(mobile, text) {
      if (!cfg.lineNumber) throw new Error("SMSIR_LINE_NUMBER تنظیم نشده است (پیامک سفارش).");
      const data = await post<{ messageIds?: (number | null)[] }>("send/bulk", {
        lineNumber: Number(cfg.lineNumber),
        messageText: text,
        mobiles: [mobile],
      });
      // ۰ = شماره در لیست سیاه، null = شماره‌ی نامعتبر یا متن بلند (مستندات SMS.ir)
      const id = data?.messageIds?.[0];
      if (id === 0) throw new SmsIrError(115);
      if (id == null) throw new SmsIrError(104);
    },
  };
}
