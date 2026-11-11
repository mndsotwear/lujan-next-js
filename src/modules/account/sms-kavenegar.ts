/**
 * کاوه‌نگار (D-064) — ارسال واقعی پیامک.
 * کد ورود با «ارسال سریع» (verify/lookup) و قالبی که در پنل کاوه‌نگار ثبت و تأیید شده می‌رود:
 * این مسیر روی خط خدماتی است، به لیست سیاه مخابرات نمی‌خورد و سریع‌تر می‌رسد.
 * اعلان‌های سفارش و موجودی با sms/send و خط فرستنده‌ی شما می‌روند.
 * کلید API در نشانی است؛ برای همین در هیچ پیام خطا یا لاگی نشانی چاپ نمی‌شود.
 */
import type { SmsSender } from "./sms";

export type KavenegarConfig = {
  apiKey: string;
  /** نام قالب کد ورود در پنل کاوه‌نگار (مثلاً «login-otp») */
  otpTemplate: string;
  /** شماره‌ی خط فرستنده برای پیامک‌های عادی؛ خالی = خط پیش‌فرض حساب */
  sender?: string;
};

type Fetch = typeof fetch;

/** کدهای خطای پرتکرار کاوه‌نگار، برای لاگ قابل‌فهم */
const STATUS: Record<number, string> = {
  400: "پارامترها ناقص است",
  401: "حساب کاربری غیرفعال است",
  403: "کلید API نامعتبر است",
  411: "شماره‌ی گیرنده نامعتبر است",
  412: "خط فرستنده نامعتبر است",
  413: "متن پیام خالی یا بیش از حد طولانی است",
  418: "اعتبار حساب کافی نیست",
  422: "نویسه‌ی نامعتبر در داده",
  424: "قالب پیدا نشد یا هنوز تأیید نشده است",
  426: "این روش برای حساب شما فعال نیست",
  431: "ساختار کد ارسالی نامعتبر است",
  451: "درخواست بیش از حد از این IP",
  501: "حساب آزمایشی فقط به شماره‌ی خود صاحب حساب پیامک می‌دهد",
};

export class KavenegarError extends Error {
  constructor(
    readonly status: number,
    detail?: string,
  ) {
    super(`کاوه‌نگار ${status}: ${STATUS[status] ?? detail ?? "خطای ناشناخته"}`);
    this.name = "KavenegarError";
  }
}

/** شماره‌ی ۰۹… به همان شکل پذیرفته می‌شود؛ فاصله در توکن مجاز نیست */
const token = (v: string) => v.replace(/\s+/g, "_");

export function kavenegarSender(cfg: KavenegarConfig, fetchImpl: Fetch = fetch): SmsSender {
  if (!cfg.apiKey) throw new Error("KAVENEGAR_API_KEY تنظیم نشده است.");
  if (!cfg.otpTemplate) throw new Error("KAVENEGAR_OTP_TEMPLATE تنظیم نشده است.");
  const base = `https://api.kavenegar.com/v1/${encodeURIComponent(cfg.apiKey)}`;

  async function call(path: string, params: Record<string, string>): Promise<void> {
    let res: Response;
    try {
      res = await fetchImpl(`${base}/${path}`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded; charset=utf-8" },
        body: new URLSearchParams(params).toString(),
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
    } catch (e) {
      // پیام خطای fetch ممکن است نشانی (و کلید) را داشته باشد؛ فقط نوع خطا گزارش می‌شود
      throw new Error(`کاوه‌نگار در دسترس نیست (${e instanceof Error ? e.name : "network"})`);
    }
    const body = (await res.json().catch(() => null)) as {
      return?: { status?: number; message?: string };
    } | null;
    const status = body?.return?.status ?? res.status;
    if (status !== 200) throw new KavenegarError(status, body?.return?.message);
  }

  return {
    async sendOtp(mobile, code) {
      await call("verify/lookup.json", {
        receptor: mobile,
        token: token(code),
        template: cfg.otpTemplate,
      });
    },
    async sendText(mobile, text) {
      await call("sms/send.json", {
        receptor: mobile,
        message: text,
        ...(cfg.sender ? { sender: cfg.sender } : {}),
      });
    },
  };
}
