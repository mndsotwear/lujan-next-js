/**
 * ارسال پیامک — لایه‌ی قابل تعویض (D-019) با SMS_PROVIDER:
 * dev = چاپ در ترمینال (فقط توسعه و آزمون)، smsir = ارسال واقعی با SMS.ir (D-064)،
 * kavenegar = جایگزین آماده. ارائه‌دهنده‌ی دیگر فقط یک فایل مثل sms-smsir.ts و یک شاخه در getSmsSender است.
 */
import { fa } from "@/content/fa";
import { maskMobile } from "./mobile";
import { otpMessage } from "./otp-message";
import { kavenegarSender } from "./sms-kavenegar";
import { smsIrSender } from "./sms-smsir";

/** متن پیامک کد ورود با هشدار «به کسی ندهید» (D-022) */
export const otpText = (code: string) =>
  otpMessage(code, fa.site.name, process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");

export interface SmsSender {
  sendOtp(mobile: string, code: string): Promise<void>;
  /** اعلان سفارش (FR-CHK-10) */
  sendText(mobile: string, text: string): Promise<void>;
}

const devSender: SmsSender = {
  async sendOtp(mobile, code) {
    // خط اول قالب قبلی را نگه می‌دارد (اسکریپت‌ها و راهنما کد را از «[DEV SMS] کد ورود برای» می‌خوانند)
    console.log(`\n[DEV SMS] کد ورود برای ${maskMobile(mobile)}: ${code}\n${otpText(code)}\n`);
  },
  async sendText(mobile, text) {
    console.log(`\n[DEV SMS] به ${maskMobile(mobile)}: ${text}\n`);
  },
};

export function getSmsSender(): SmsSender {
  const provider = process.env.SMS_PROVIDER ?? "dev";
  if (provider === "dev") {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_SMS !== "1") {
      throw new Error("SMS_PROVIDER در محیط تولید تنظیم نشده است (D-019).");
    }
    return devSender;
  }
  if (provider === "smsir") {
    return smsIrSender({
      apiKey: process.env.SMSIR_API_KEY ?? "",
      otpTemplateId: Number(process.env.SMSIR_OTP_TEMPLATE_ID),
      otpParam: process.env.SMSIR_OTP_PARAM || undefined,
      lineNumber: process.env.SMSIR_LINE_NUMBER || undefined,
    });
  }
  if (provider === "kavenegar") {
    return kavenegarSender({
      apiKey: process.env.KAVENEGAR_API_KEY ?? "",
      otpTemplate: process.env.KAVENEGAR_OTP_TEMPLATE ?? "",
      sender: process.env.KAVENEGAR_SENDER || undefined,
    });
  }
  throw new Error(`ارائه‌دهنده‌ی پیامک «${provider}» پیاده نشده است.`);
}
