/** بررسی و مصرف کد پیامکی — مشترک بین ورود مشتری و فعال‌سازی کارکنان (فقط سرور) */
import { fa } from "@/content/fa";
import { db } from "@/lib/db";
import { toLatinDigits } from "@/lib/format";
import { normalizeMobile } from "./mobile";
import { OTP, verifyCode } from "./otp";
import { authSecret } from "./secret";

export type OtpCheck = { ok: true; mobile: string } | { ok: false; message: string };

export async function consumeOtp(mobileInput: string, codeInput: string): Promise<OtpCheck> {
  const mobile = normalizeMobile(mobileInput);
  const code = toLatinDigits(codeInput).replace(/\D/g, "");
  if (!mobile || code.length !== OTP.length) return { ok: false, message: fa.account.errors.code };
  const otp = await db.otpCode.findFirst({
    where: { mobile, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.expiresAt < new Date()) return { ok: false, message: fa.account.errors.expired };
  if (otp.attempts >= OTP.maxAttempts) return { ok: false, message: fa.account.errors.attempts };
  if (!verifyCode(code, mobile, otp.codeHash, authSecret())) {
    await db.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    const left = OTP.maxAttempts - otp.attempts - 1;
    return {
      ok: false,
      message: left > 0 ? fa.account.errors.wrongCode(left) : fa.account.errors.attempts,
    };
  }
  await db.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  return { ok: true, mobile };
}
