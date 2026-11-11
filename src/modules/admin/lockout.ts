/** قفل پس از تلاش‌های ناموفق (NFR-SEC-04، D-035) — منطق خالص */
export const LOCKOUT = { maxFailures: 5, lockMinutes: 15 } as const;

export const isLocked = (lockedUntil: Date | null, now = new Date()) =>
  !!lockedUntil && lockedUntil.getTime() > now.getTime();

/** پس از یک تلاش ناموفق: شمارنده‌ی تازه و زمان پایان قفل (اگر به سقف رسید) */
export function afterFailure(
  failedLogins: number,
  now = new Date(),
): { failedLogins: number; lockedUntil: Date | null } {
  const n = failedLogins + 1;
  return n >= LOCKOUT.maxFailures
    ? { failedLogins: 0, lockedUntil: new Date(now.getTime() + LOCKOUT.lockMinutes * 60_000) }
    : { failedLogins: n, lockedUntil: null };
}
