/** نشست ورود: توکن تصادفی در کوکی httpOnly، فقط هش آن در پایگاه داده (D-021). */
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { pickClientIp, trustedHops } from "./client-ip";

export const SESSION_COOKIE = "session";
const TTL_DAYS = 30;

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const ua = (await headers()).get("user-agent")?.slice(0, 200) ?? null;
  const expiresAt = new Date(Date.now() + TTL_DAYS * 86_400_000);
  await db.session.create({
    data: { tokenHash: hashToken(token), userId, userAgent: ua, expiresAt },
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

export type CurrentUser = {
  id: string;
  mobile: string;
  name: string | null;
  email: string | null;
  role: string;
  customerType: string;
};

/** کاربر واردشده‌ی همین درخواست (یک بار در هر درخواست) */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const s = await db.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (!s || s.expiresAt < new Date() || s.user.deletedAt) return null;
    const { id, mobile, name, email, role, customerType } = s.user;
    return { id, mobile, name, email, role, customerType };
  } catch (e) {
    console.error("getCurrentUser failed", e);
    return null;
  }
});

/** برای صفحه‌های حساب: اگر وارد نشده، به ورود با بازگشت به همین صفحه */
export async function requireUser(next: string): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}

/** IP برای محدودیت نرخ و قفل ورود؛ فقط از پراکسی‌های خودمان (D-022) */
export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return pickClientIp(h.get("x-forwarded-for"), h.get("x-real-ip"), trustedHops());
}

/** نشست‌های فعال کاربر برای «دستگاه‌های واردشده» (D-022) */
export async function listMySessions(userId: string) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const current = token ? hashToken(token) : null;
  const rows = await db.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, tokenHash: true, userAgent: true, createdAt: true },
  });
  return rows.map((r) => ({
    id: r.id,
    userAgent: r.userAgent,
    createdAt: r.createdAt,
    current: r.tokenHash === current,
  }));
}

/** همه‌ی نشست‌ها جز همین مرورگر؛ تعداد حذف‌شده */
export async function endOtherSessions(userId: string): Promise<number> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const keep = token ? hashToken(token) : "";
  const r = await db.session.deleteMany({ where: { userId, NOT: { tokenHash: keep } } });
  return r.count;
}
