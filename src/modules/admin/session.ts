/**
 * نشست پنل مدیریت (D-035): جدا از نشست مشتری، کوکی SameSite=Strict، حداکثر ۱۲ ساعت و
 * پایان پس از ۲ ساعت بی‌فعالیتی. فقط هش توکن در پایگاه داده.
 */
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { clientIp } from "@/modules/account/server";
import { can, isStaffRole, type Permission, type StaffRole } from "./permissions";

export const ADMIN_COOKIE = "admin_session";
const MAX_MS = 12 * 3_600_000;
const IDLE_MS = 2 * 3_600_000;
const TOUCH_MS = 5 * 60_000;

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export const cookieBase = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function createAdminSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + MAX_MS);
  await db.adminSession.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      userAgent: (await headers()).get("user-agent")?.slice(0, 200) ?? null,
      ip: await clientIp(),
      expiresAt,
    },
  });
  (await cookies()).set(ADMIN_COOKIE, token, { ...cookieBase, expires: expiresAt });
}

export async function destroyAdminSession() {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (token) await db.adminSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(ADMIN_COOKIE);
}

export type Staff = { id: string; mobile: string; name: string | null; role: StaffRole };

/** کارمند واردشده‌ی همین درخواست */
export const getStaff = cache(async (): Promise<Staff | null> => {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const s = await db.adminSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  const now = Date.now();
  if (!s || s.expiresAt.getTime() < now || now - s.lastSeenAt.getTime() > IDLE_MS) return null;
  const u = s.user;
  if (!isStaffRole(u.role) || u.staffDisabledAt || u.deletedAt || !u.totpEnabledAt) return null;
  if (now - s.lastSeenAt.getTime() > TOUCH_MS)
    await db.adminSession.update({ where: { id: s.id }, data: { lastSeenAt: new Date() } });
  return { id: u.id, mobile: u.mobile, name: u.name, role: u.role };
});

/** برای صفحه‌های پنل: بدون ورود ← صفحه‌ی ورود؛ بدون مجوز ← ۴۰۴ (وجود بخش لو نرود) */
export async function requireStaff(permission?: Permission): Promise<Staff> {
  const s = await getStaff();
  if (!s) redirect("/admin/login");
  if (permission && !can(s.role, permission)) notFound();
  return s;
}

/** برای Server Actionها: null یعنی اجازه نیست */
export async function staffWith(permission: Permission): Promise<Staff | null> {
  const s = await getStaff();
  return s && can(s.role, permission) ? s : null;
}
