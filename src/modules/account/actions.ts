"use server";
/** ورود با کد پیامکی و مدیریت حساب (FR-ACC-01, 02, 06) */
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fa } from "@/content/fa";
import { db } from "@/lib/db";
import { CART_COOKIE } from "@/modules/cart/server";
import {
  normalizePostalCode,
  normalizePhone,
  validateAddress,
  type AddressErrors,
  type AddressInput,
} from "./address";
import { attachCartToUser } from "./cart-merge";
import { consumeOtp } from "./otp-check";
import { isValidIban, normalizeIban } from "./iban";
import { sealIban } from "./iban-store";
import { maskMobile, normalizeMobile } from "./mobile";
import { captchaRequired, checkChallenge } from "./captcha";
import { canSend, generateCode, hashCode, OTP } from "./otp";
import { authSecret } from "./secret";
import {
  clientIp,
  createSession,
  destroySession,
  endOtherSessions,
  getCurrentUser,
} from "./session";
import { getSmsSender } from "./sms";
import { toLatinDigits } from "@/lib/format";

export type SendOtpState = {
  ok: boolean;
  message?: string;
  mobile?: string;
  retryInSec?: number;
  /** رفتار مشکوک: پیش از ارسال کد، کپچا لازم است (D-022، D-059) */
  captcha?: boolean;
};
export type CaptchaAnswer = { token: string; answer: string };
export type VerifyOtpState = { ok: boolean; message?: string; next?: string };
/** values: مقادیر ارسال‌شده تا پس از خطا فرم خالی نشود (React 19 فرم را پس از action بازنشانی می‌کند) */
export type FormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
};

export async function sendOtp(mobileInput: string, captcha?: CaptchaAnswer): Promise<SendOtpState> {
  const mobile = normalizeMobile(mobileInput);
  if (!mobile) return { ok: false, message: fa.account.errors.mobile };
  return issueOtp(mobile, captcha);
}

/**
 * کد ثابت فقط برای آزمون سرتاسری خودکار (M1.11b): فقط وقتی پیامک در حالت توسعه است
 * (روی سرور واقعی با ارائه‌دهنده‌ی پیامک هرگز فعال نمی‌شود) و E2E_OTP پنج رقم است.
 */
function e2eCode(): string | null {
  const v = process.env.E2E_OTP ?? "";
  return (process.env.SMS_PROVIDER ?? "dev") === "dev" && /^\d{5}$/.test(v) ? v : null;
}

/** ساخت و ارسال کد با محدودیت نرخ و کپچای شرطی — مشترک ورود و حذف حساب */
async function issueOtp(mobile: string, captcha?: CaptchaAnswer): Promise<SendOtpState> {
  const ip = await clientIp();
  const hourAgo = new Date(Date.now() - 3_600_000);
  const [byMobile, byIp] = await Promise.all([
    db.otpCode.findMany({
      where: { mobile, createdAt: { gt: hourAgo } },
      select: { createdAt: true },
    }),
    ip
      ? db.otpCode.findMany({
          where: { ip, createdAt: { gt: hourAgo } },
          select: { createdAt: true },
        })
      : Promise.resolve([]),
  ]);
  const decision = canSend(
    byMobile.map((r) => r.createdAt),
    // آزمون خودکار همه‌ی ورودها را از یک IP می‌فرستد؛ فقط در حالت E2E سقف IP نادیده گرفته می‌شود
    e2eCode() ? [] : byIp.map((r) => r.createdAt),
  );
  if (!decision.ok) {
    if (decision.reason === "too_many") return { ok: false, message: fa.account.errors.tooMany };
    // «همان کد قبلی را وارد کنید» فقط اگر واقعاً کد معتبر و مصرف‌نشده‌ای هست؛
    // وگرنه (مثلاً کد ورود همین الان مصرف شد) کاربر باید کمی صبر کند
    const live = await db.otpCode.count({
      where: { mobile, consumedAt: null, expiresAt: { gt: new Date() } },
    });
    return live
      ? {
          ok: true,
          mobile,
          retryInSec: decision.retryInSec,
          message: fa.account.errors.wait(decision.retryInSec),
        }
      : { ok: false, message: fa.account.errors.waitNoCode(decision.retryInSec) };
  }
  if (captchaRequired(byMobile.length, byIp.length) && !e2eCode()) {
    if (!captcha?.token)
      return { ok: false, captcha: true, mobile, message: fa.account.captcha.needed };
    if (!checkChallenge(captcha.token, captcha.answer, authSecret()))
      return { ok: false, captcha: true, mobile, message: fa.account.captcha.wrong };
  }
  const code = e2eCode() ?? generateCode();
  await db.otpCode.create({
    data: {
      mobile,
      ip,
      codeHash: hashCode(code, mobile, authSecret()),
      expiresAt: new Date(Date.now() + OTP.ttlMs),
    },
  });
  try {
    await getSmsSender().sendOtp(mobile, code);
  } catch (e) {
    console.error("SMS failed for", maskMobile(mobile), e);
    return { ok: false, message: fa.account.errors.smsFailed };
  }
  return { ok: true, mobile, retryInSec: OTP.resendAfterMs / 1000 };
}

const safeNext = (n: string | undefined) =>
  n && n.startsWith("/") && !n.startsWith("//") ? n : "/account";

export async function verifyOtp(
  mobileInput: string,
  codeInput: string,
  next?: string,
): Promise<VerifyOtpState> {
  const r = await consumeOtp(mobileInput, codeInput);
  if (!r.ok) return r;
  const mobile = r.mobile;
  const user = await db.user.upsert({ where: { mobile }, update: {}, create: { mobile } });
  await createSession(user.id);
  try {
    await attachCartToUser(user.id);
  } catch (e) {
    console.error("cart merge failed (login continues):", e); // ورود نباید به‌خاطر سبد شکست بخورد
  }
  return { ok: true, next: safeNext(next) };
}

export async function logout(): Promise<void> {
  await destroySession();
  (await cookies()).delete(CART_COOKIE); // سبد کاربر به حسابش وصل می‌ماند؛ این مرورگر سبد مهمان تازه می‌گیرد
  revalidatePath("/", "layout");
}

async function me() {
  const u = await getCurrentUser();
  if (!u) throw new Error("UNAUTHENTICATED");
  return u;
}

export async function updateProfile(_: FormState, form: FormData): Promise<FormState> {
  const u = await me();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = fa.account.errors.name;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = fa.account.errors.email;
  // شبا فقط وقتی فرم کامل است (فرم خلاصه‌ی تسویه آن را ندارد)
  const ibanInput = form.has("refundIban") ? normalizeIban(String(form.get("refundIban"))) : null;
  if (ibanInput && !isValidIban(ibanInput)) errors.refundIban = fa.account.errors.iban;
  const values = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  if (Object.keys(errors).length) return { ok: false, errors, values };
  const invoiceInfo = {
    companyName: String(form.get("companyName") ?? "").trim() || null,
    nationalId: toLatinDigits(String(form.get("nationalId") ?? "")).replace(/\D/g, "") || null,
    economicCode: toLatinDigits(String(form.get("economicCode") ?? "")).replace(/\D/g, "") || null,
  };
  try {
    // ایمیل عوض شد: عضویت ایمیلی خبرنامه‌ی همین کاربر به نشانی تازه منتقل می‌شود (یا اگر ایمیل حذف شد، لغو)
    const oldEmail = u.email?.toLowerCase() ?? null;
    const newEmail = email ? email.toLowerCase() : null;
    if (oldEmail && oldEmail !== newEmail) {
      const taken = newEmail
        ? await db.subscriber.findUnique({
            where: { channel_address: { channel: "EMAIL", address: newEmail } },
          })
        : null;
      if (newEmail && !taken)
        await db.subscriber.updateMany({
          where: { channel: "EMAIL", address: oldEmail },
          data: { address: newEmail, userId: u.id },
        });
      else
        await db.subscriber.updateMany({
          where: { channel: "EMAIL", address: oldEmail, unsubscribedAt: null },
          data: { unsubscribedAt: new Date() },
        });
    }
    await db.user.update({
      where: { id: u.id },
      data: {
        name,
        email: email || null,
        invoiceInfo,
        ...(ibanInput !== null ? { refundIban: ibanInput ? sealIban(ibanInput) : null } : {}),
      },
    });
  } catch {
    return {
      ok: false,
      errors: { email: fa.account.errors.emailTaken },
      values: Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)])),
    };
  }
  revalidatePath("/account", "layout");
  return { ok: true, message: fa.account.saved };
}

export async function saveAddress(_: FormState, form: FormData): Promise<FormState> {
  const u = await me();
  const input: AddressInput = {
    title: String(form.get("title") ?? "").trim(),
    province: String(form.get("province") ?? ""),
    city: String(form.get("city") ?? "").trim(),
    postalCode: String(form.get("postalCode") ?? ""),
    line: String(form.get("line") ?? "").trim(),
    recipient: String(form.get("recipient") ?? "").trim(),
    phone: String(form.get("phone") ?? ""),
  };
  const errors: AddressErrors = validateAddress(input);
  if (Object.keys(errors).length)
    return {
      ok: false,
      errors: errors as Record<string, string>,
      values: { ...input, title: input.title ?? "" },
    };
  const id = String(form.get("id") ?? "");
  const data = {
    ...input,
    title: input.title || null,
    postalCode: normalizePostalCode(input.postalCode),
    phone: normalizePhone(input.phone),
  };
  const count = await db.address.count({ where: { userId: u.id } });
  if (id) await db.address.updateMany({ where: { id, userId: u.id }, data });
  else await db.address.create({ data: { ...data, userId: u.id, isDefault: count === 0 } });
  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
  return { ok: true, message: fa.account.saved };
}

export async function deleteAddress(id: string): Promise<void> {
  const u = await me();
  const a = await db.address.findFirst({ where: { id, userId: u.id } });
  if (!a) return;
  await db.address.delete({ where: { id } });
  if (a.isDefault) {
    const next = await db.address.findFirst({
      where: { userId: u.id },
      orderBy: { createdAt: "desc" },
    });
    if (next) await db.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  revalidatePath("/account/addresses");
}

export async function setDefaultAddress(id: string): Promise<void> {
  const u = await me();
  await db.$transaction([
    db.address.updateMany({ where: { userId: u.id }, data: { isDefault: false } }),
    db.address.updateMany({ where: { id, userId: u.id }, data: { isDefault: true } }),
  ]);
  revalidatePath("/account/addresses");
}

/** کد تأیید تازه پیش از حذف حساب، به موبایل خود کاربر (D-022 بند ۲) */
export async function requestDeleteCode(captcha?: CaptchaAnswer): Promise<SendOtpState> {
  const u = await me();
  return issueOtp(u.mobile, captcha);
}

/** حذف حساب بنا به درخواست (FR-ACC-06): اطلاعات شخصی پاک، سفارش‌ها برای حسابداری می‌مانند. */
export async function deleteAccount(_: FormState, form: FormData): Promise<FormState> {
  const u = await me();
  if (form.get("confirm") !== "on") return { ok: false, message: fa.account.deleteConfirmRequired };
  // کد پیامکی تازه: اگر کسی به مرورگر باز دسترسی داشت، بدون گوشی صاحب حساب نمی‌تواند حذفش کند
  const check = await consumeOtp(u.mobile, String(form.get("code") ?? ""));
  if (!check.ok) return { ok: false, message: check.message };
  await db.$transaction([
    db.address.deleteMany({ where: { userId: u.id } }),
    db.session.deleteMany({ where: { userId: u.id } }),
    db.cart.updateMany({ where: { userId: u.id }, data: { userId: null } }),
    // خبرنامه: رضایت‌ها پاک (شماره و ایمیل دیگر نگه داشته نمی‌شوند)
    db.subscriber.deleteMany({
      where: {
        OR: [
          { userId: u.id },
          { channel: "SMS", address: u.mobile },
          ...(u.email ? [{ channel: "EMAIL" as const, address: u.email.toLowerCase() }] : []),
        ],
      },
    }),
    db.user.update({
      where: { id: u.id },
      data: {
        mobile: `deleted-${u.id}`,
        name: null,
        email: null,
        invoiceInfo: Prisma.DbNull,
        refundIban: null,
        marketingSms: false,
        marketingEmail: false,
        deletedAt: new Date(),
      },
    }),
  ]);
  const jar = await cookies();
  jar.delete("session");
  jar.delete(CART_COOKIE);
  revalidatePath("/", "layout");
  // مستقیم به صفحه‌ی اصلی؛ وگرنه صفحه‌ی حساب دوباره رندر و به «ورود» فرستاده می‌شد
  redirect("/?account=deleted");
}

/** خروج از همه‌ی دستگاه‌های دیگر؛ همین مرورگر وارد می‌ماند (D-022 بند ۳) */
export async function logoutOtherDevices(): Promise<{
  ok: boolean;
  message: string;
  count: number;
}> {
  const u = await me();
  const count = await endOtherSessions(u.id);
  revalidatePath("/account/profile");
  return { ok: true, message: fa.account.sessions.done(count), count };
}
