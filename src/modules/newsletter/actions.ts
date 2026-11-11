"use server";
/** خبرنامه: عضویت از فوتر، تنظیم در حساب، لغو با پیوند (FR-MKT-01، D-055) */
import { revalidatePath } from "next/cache";
import { fa } from "@/content/fa";
import { db } from "@/lib/db";
import { hit } from "@/lib/rate-limit";
import { clientIp, getCurrentUser } from "@/modules/account/server";
import { parseContact } from "./rules";
import { optIn, optOut } from "./store";

export type NewsletterState = { ok: boolean; message: string } | null;

export async function subscribe(_prev: NewsletterState, form: FormData): Promise<NewsletterState> {
  const t = fa.newsletter;
  if (form.get("consent") !== "on") return { ok: false, message: t.errors.consent };
  const contact = parseContact(String(form.get("contact") ?? "").slice(0, 254));
  if (!contact) return { ok: false, message: t.errors.contact };
  const ip = (await clientIp()) ?? "unknown";
  if (!hit(`newsletter:${ip}`, 5, 10 * 60_000)) return { ok: false, message: t.errors.tooMany };
  const user = await getCurrentUser();
  const mine = user && (user.mobile === contact.address || user.email === contact.address);
  await optIn(contact, "footer", mine ? user.id : null);
  // پاسخ یکسان برای عضو تازه و قبلی تا عضویت دیگران فاش نشود
  return { ok: true, message: contact.channel === "SMS" ? t.doneSms : t.doneEmail };
}

export async function saveMyConsents(
  _prev: NewsletterState,
  form: FormData,
): Promise<NewsletterState> {
  const t = fa.newsletter;
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: t.errors.login };
  const wantSms = form.get("sms") === "on";
  const wantEmail = form.get("email") === "on";
  const sms = { channel: "SMS" as const, address: user.mobile };
  if (wantSms) await optIn(sms, "account", user.id);
  else await optOut(sms);
  if (user.email) {
    const email = { channel: "EMAIL" as const, address: user.email.toLowerCase() };
    if (wantEmail) await optIn(email, "account", user.id);
    else await optOut(email);
  } else if (wantEmail) {
    return { ok: false, message: t.errors.noEmail };
  }
  revalidatePath("/account/profile");
  return { ok: true, message: t.saved };
}

/** دکمه‌ی صفحه‌ی لغو (نه با باز شدن پیوند، تا پیش‌نمایش ایمیل لغو نکند) */
export async function unsubscribeByToken(
  _prev: NewsletterState,
  form: FormData,
): Promise<NewsletterState> {
  const token = String(form.get("token") ?? "").slice(0, 64);
  const s = token ? await db.subscriber.findUnique({ where: { token } }) : null;
  if (!s) return { ok: false, message: fa.newsletter.errors.badLink };
  if (!s.unsubscribedAt)
    await db.subscriber.update({ where: { id: s.id }, data: { unsubscribedAt: new Date() } });
  return { ok: true, message: fa.newsletter.unsubscribed };
}
