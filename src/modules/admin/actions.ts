"use server";
/** ورود کارکنان، فعال‌سازی و مدیریت کارکنان (FR-ADM-10، NFR-SEC-04، D-035) */
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { fa } from "@/content/fa";
import { db } from "@/lib/db";
import { hit } from "@/lib/rate-limit";
import { normalizeMobile } from "@/modules/account";
import { sendOtp } from "@/modules/account/actions";
import { authSecret, clientIp, consumeOtp } from "@/modules/account/server";
import { audit } from "./audit";
import { open, seal } from "./box";
import { afterFailure, isLocked } from "./lockout";
import { hashPassword, passwordProblems, verifyPassword } from "./password";
import { isStaffRole, STAFF_ROLES, type StaffRole } from "./permissions";
import { consumeRecoveryCode, generateRecoveryCodes, hashRecovery } from "./recovery";
import {
  cookieBase,
  createAdminSession,
  destroyAdminSession,
  getStaff,
  staffWith,
  type Staff,
} from "./session";
import { SETUP_COOKIE as SETUP } from "./setup";
import { readToken, signToken } from "./signed";
import { generateTotpSecret, verifyTotp } from "./totp";

const PENDING = "admin_pending";
const t = fa.admin;
// رمز ساختگی برای اینکه پاسخ «کاربر نیست» و «رمز غلط» هم‌زمان باشند
const DUMMY = hashPassword("dummy-password-for-timing");

const minutesLeft = (until: Date) =>
  Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60_000));

export type LoginState = { ok: boolean; message?: string; step?: "code"; redirect?: string };

/** مرحله‌ی ۱: موبایل و رمز */
export async function loginPassword(mobileInput: string, password: string): Promise<LoginState> {
  const ip = (await clientIp()) ?? "unknown";
  if (!hit(`admin-login:${ip}`, 20, 10 * 60_000))
    return { ok: false, message: t.login.errors.rateLimited };
  const mobile = normalizeMobile(mobileInput);
  const user = mobile ? await db.user.findUnique({ where: { mobile } }) : null;
  const eligible =
    !!user &&
    isStaffRole(user.role) &&
    !user.staffDisabledAt &&
    !user.deletedAt &&
    !!user.totpEnabledAt;
  if (!eligible || !user) {
    verifyPassword(password, DUMMY);
    return { ok: false, message: t.login.errors.invalid };
  }
  if (user.lockedUntil && isLocked(user.lockedUntil))
    return { ok: false, message: t.login.errors.locked(minutesLeft(user.lockedUntil)) };
  if (!verifyPassword(password, user.passwordHash)) {
    await fail(user.id, user.failedLogins, "password");
    return { ok: false, message: t.login.errors.invalid };
  }
  (await cookies()).set(
    PENDING,
    signToken({ uid: user.id, exp: Date.now() + 5 * 60_000 }, authSecret()),
    {
      ...cookieBase,
      maxAge: 300,
    },
  );
  return { ok: true, step: "code" };
}

async function fail(userId: string, failed: number, stage: string) {
  const next = afterFailure(failed);
  await db.user.update({ where: { id: userId }, data: next });
  await audit(userId, next.lockedUntil ? "auth.locked" : "auth.fail", "user", userId, { stage });
}

/** مرحله‌ی ۲: کد اپ کدساز یا کد پشتیبان */
export async function loginSecondFactor(codeInput: string): Promise<LoginState> {
  const jar = await cookies();
  const pending = readToken<{ uid: string; exp: number }>(jar.get(PENDING)?.value, authSecret());
  if (!pending) return { ok: false, message: t.login.errors.expired };
  const user = await db.user.findUnique({ where: { id: pending.uid } });
  if (!user || !user.totpSecret || !isStaffRole(user.role) || user.staffDisabledAt)
    return { ok: false, message: t.login.errors.expired };
  if (user.lockedUntil && isLocked(user.lockedUntil))
    return { ok: false, message: t.login.errors.locked(minutesLeft(user.lockedUntil)) };

  const code = codeInput.trim();
  const secret = open(user.totpSecret, authSecret());
  let update: { totpLastCounter?: number; recoveryCodes?: string[] } | null = null;
  if (/^[0-9۰-۹]{6}$/.test(code)) {
    const latin = code.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
    const counter = secret ? verifyTotp(secret, latin, Date.now(), user.totpLastCounter) : null;
    if (counter !== null) update = { totpLastCounter: counter };
  } else {
    const left = consumeRecoveryCode(code, user.recoveryCodes, authSecret());
    if (left) update = { recoveryCodes: left };
  }
  if (!update) {
    await fail(user.id, user.failedLogins, "code");
    return { ok: false, message: t.login.errors.code };
  }
  await db.user.update({
    where: { id: user.id },
    data: { ...update, failedLogins: 0, lockedUntil: null },
  });
  jar.delete(PENDING);
  await createAdminSession(user.id);
  await audit(user.id, "auth.login", "user", user.id, {
    method: update.recoveryCodes ? "recovery" : "totp",
  });
  return { ok: true, redirect: "/admin" };
}

export async function adminLogout(): Promise<void> {
  const s = await getStaff();
  await destroyAdminSession();
  if (s) await audit(s.id, "auth.logout", "user", s.id);
}

// ───────── فعال‌سازی اولیه ─────────

const canActivate = (
  u: {
    role: string;
    staffDisabledAt: Date | null;
    totpEnabledAt: Date | null;
    deletedAt: Date | null;
  } | null,
) => !!u && isStaffRole(u.role) && !u.staffDisabledAt && !u.deletedAt && !u.totpEnabledAt;

/** پیام یکسان تا معلوم نشود کدام شماره کارمند است */
export async function startActivation(
  mobileInput: string,
): Promise<{ ok: boolean; message: string }> {
  const mobile = normalizeMobile(mobileInput);
  if (!mobile) return { ok: false, message: fa.account.errors.mobile };
  const user = await db.user.findUnique({ where: { mobile } });
  if (canActivate(user)) {
    const r = await sendOtp(mobile);
    if (!r.ok) return { ok: false, message: r.message ?? fa.account.errors.smsFailed };
  } else if (
    (process.env.SMS_PROVIDER ?? "dev") === "dev" &&
    process.env.NODE_ENV !== "production"
  ) {
    // فقط روی سیستم توسعه: راهنمای روشن؛ روی سایت واقعی پیام یکسان می‌ماند
    return { ok: false, message: t.activate.devNotStaff };
  }
  return { ok: true, message: t.activate.sent };
}

export async function verifyActivation(
  mobileInput: string,
  code: string,
): Promise<{ ok: boolean; message?: string }> {
  const r = await consumeOtp(mobileInput, code);
  if (!r.ok) return r;
  const user = await db.user.findUnique({ where: { mobile: r.mobile } });
  if (!user || !canActivate(user)) return { ok: false, message: t.activate.notEligible };
  await db.user.update({
    where: { id: user.id },
    data: { totpSecret: seal(generateTotpSecret(), authSecret()), totpLastCounter: null },
  });
  (await cookies()).set(
    SETUP,
    signToken({ uid: user.id, exp: Date.now() + 15 * 60_000 }, authSecret()),
    {
      ...cookieBase,
      maxAge: 900,
    },
  );
  return { ok: true };
}

export type SetupState = { ok: boolean; message?: string; recovery?: string[] } | null;

export async function completeSetup(_prev: SetupState, form: FormData): Promise<SetupState> {
  const jar = await cookies();
  const setup = readToken<{ uid: string; exp: number }>(jar.get(SETUP)?.value, authSecret());
  if (!setup) return { ok: false, message: t.activate.expired };
  const user = await db.user.findUnique({ where: { id: setup.uid } });
  if (!user || !canActivate(user) || !user.totpSecret)
    return { ok: false, message: t.activate.expired };

  const password = String(form.get("password") ?? "");
  if (password !== String(form.get("password2") ?? ""))
    return { ok: false, message: t.activate.mismatch };
  const problems = passwordProblems(password, user.mobile);
  if (problems.length) return { ok: false, message: t.activate.problems[problems[0]!] };

  const secret = open(user.totpSecret, authSecret());
  const code = String(form.get("code") ?? "")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .trim();
  const counter = secret ? verifyTotp(secret, code) : null;
  if (counter === null) return { ok: false, message: t.login.errors.code };

  const recovery = generateRecoveryCodes();
  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashPassword(password),
      totpEnabledAt: new Date(),
      totpLastCounter: counter,
      recoveryCodes: recovery.map((c) => hashRecovery(c, authSecret())),
      failedLogins: 0,
      lockedUntil: null,
    },
  });
  // کوکی SETUP پاک نمی‌شود: صفحه بعد از اکشن دوباره رندر می‌شود و باید کدهای پشتیبان بماند؛
  // خودش تا ۱۵ دقیقه منقضی می‌شود و بعد از فعال‌سازی هیچ رازی نشان نمی‌دهد.
  await createAdminSession(user.id);
  await audit(user.id, "staff.activate", "user", user.id);
  return { ok: true, recovery };
}

// ───────── مدیریت کارکنان (فقط مدیر کل) ─────────

export type StaffFormState = { ok: boolean; message: string } | null;

const activeAdmins = () =>
  db.user.count({ where: { role: "ADMIN", staffDisabledAt: null, deletedAt: null } });

export async function addStaff(_prev: StaffFormState, form: FormData): Promise<StaffFormState> {
  const me = await staffWith("staff.manage");
  if (!me) return { ok: false, message: t.forbidden };
  const mobile = normalizeMobile(String(form.get("mobile") ?? ""));
  const role = String(form.get("role") ?? "");
  const name =
    String(form.get("name") ?? "")
      .trim()
      .slice(0, 80) || null;
  if (!mobile) return { ok: false, message: t.staff.errors.mobile };
  if (!isStaffRole(role)) return { ok: false, message: t.staff.errors.role };
  const existing = await db.user.findUnique({ where: { mobile } });
  if (existing && isStaffRole(existing.role)) return { ok: false, message: t.staff.errors.exists };
  const user = await db.user.upsert({
    where: { mobile },
    update: { role, name: existing?.name ?? name, staffDisabledAt: null },
    create: { mobile, role, name },
  });
  await audit(me.id, "staff.add", "user", user.id, { role, mobile });
  revalidatePath("/admin/staff");
  return { ok: true, message: t.staff.added };
}

type Guard = { error: string } | { error?: undefined; me: Staff; target: { role: string } };

async function guardTarget(userId: string): Promise<Guard> {
  const me = await staffWith("staff.manage");
  if (!me) return { error: t.forbidden };
  if (me.id === userId) return { error: t.staff.errors.self };
  const target = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target || !isStaffRole(target.role)) return { error: t.forbidden };
  return { me, target };
}

export async function changeStaffRole(userId: string, role: string): Promise<StaffFormState> {
  const g = await guardTarget(userId);
  if (g.error !== undefined) return { ok: false, message: g.error };
  if (!(STAFF_ROLES as string[]).includes(role)) return { ok: false, message: t.staff.errors.role };
  if (g.target.role === "ADMIN" && role !== "ADMIN" && (await activeAdmins()) <= 1)
    return { ok: false, message: t.staff.errors.lastAdmin };
  await db.user.update({ where: { id: userId }, data: { role: role as StaffRole } });
  if (role !== g.target.role) await db.adminSession.deleteMany({ where: { userId } }); // مجوز تازه با ورود تازه
  await audit(g.me.id, "staff.role", "user", userId, { from: g.target.role, to: role });
  revalidatePath("/admin/staff");
  return { ok: true, message: t.staff.saved };
}

export async function setStaffDisabled(userId: string, disabled: boolean): Promise<StaffFormState> {
  const g = await guardTarget(userId);
  if (g.error !== undefined) return { ok: false, message: g.error };
  if (disabled && g.target.role === "ADMIN" && (await activeAdmins()) <= 1)
    return { ok: false, message: t.staff.errors.lastAdmin };
  await db.user.update({
    where: { id: userId },
    data: { staffDisabledAt: disabled ? new Date() : null },
  });
  if (disabled) await db.adminSession.deleteMany({ where: { userId } });
  await audit(g.me.id, disabled ? "staff.disable" : "staff.enable", "user", userId);
  revalidatePath("/admin/staff");
  return { ok: true, message: t.staff.saved };
}

/** گوشی گم شده یا کارمند رمز را فراموش کرده: باید دوباره فعال‌سازی کند */
export async function resetStaffAccess(userId: string): Promise<StaffFormState> {
  const g = await guardTarget(userId);
  if (g.error !== undefined) return { ok: false, message: g.error };
  await db.user.update({
    where: { id: userId },
    data: {
      passwordHash: null,
      totpSecret: null,
      totpEnabledAt: null,
      totpLastCounter: null,
      recoveryCodes: [],
      failedLogins: 0,
      lockedUntil: null,
    },
  });
  await db.adminSession.deleteMany({ where: { userId } });
  await audit(g.me.id, "staff.reset", "user", userId);
  revalidatePath("/admin/staff");
  return { ok: true, message: t.staff.saved };
}
