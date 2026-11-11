/** کلید امضای کد و نشست (NFR-SEC-06: در متغیر محیطی، نه در کد). */
let warned = false;
export function authSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production")
    throw new Error("AUTH_SECRET (حداقل ۳۲ نویسه) تنظیم نشده است.");
  if (!warned) {
    console.warn("⚠ AUTH_SECRET تنظیم نشده؛ کلید موقت توسعه استفاده می‌شود.");
    warned = true;
  }
  return "dev-only-insecure-secret-change-me-0123456789";
}
