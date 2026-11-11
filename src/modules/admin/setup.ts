/** کارمندی که مرحله‌ی پیامکی فعال‌سازی را گذرانده (فقط سرور) */
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { authSecret } from "@/modules/account/server";
import { open } from "./box";
import { readToken } from "./signed";

export const SETUP_COOKIE = "admin_setup";

export async function getSetupUser(): Promise<
  { done: false; mobile: string; secret: string } | { done: true } | null
> {
  const token = readToken<{ uid: string; exp: number }>(
    (await cookies()).get(SETUP_COOKIE)?.value,
    authSecret(),
  );
  const user = token ? await db.user.findUnique({ where: { id: token.uid } }) : null;
  if (!user?.totpSecret) return null;
  // تازه تمام شده: فرم همان‌جا بماند تا کدهای پشتیبان نشان داده شوند (رمز دیگر نمایش داده نمی‌شود)
  if (user.totpEnabledAt) return { done: true };
  const secret = open(user.totpSecret, authSecret());
  return secret ? { done: false, mobile: user.mobile, secret } : null;
}
