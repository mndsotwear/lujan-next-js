/**
 * سیاست امنیت محتوا (CSP، NFR-SEC-01، D-060) — منطق خالص تا قابل تست باشد.
 * اسکریپت فقط از خود سایت و با nonce هر درخواست؛ هر اسکریپت تزریق‌شده (XSS) اجرا نمی‌شود.
 * style-src با 'unsafe-inline' چون next/image و چند جزء style درون‌خطی دارند (خطر کمتر از اسکریپت).
 */
export function buildCsp(opts: {
  nonce: string;
  dev: boolean;
  analyticsOrigin?: string | null;
  paymentOrigins?: string[];
  /** فقط روی https: درخواست‌های http به https ارتقا یابد */
  upgrade?: boolean;
}): string {
  const analytics = opts.analyticsOrigin ? ` ${opts.analyticsOrigin}` : "";
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${opts.nonce}' 'strict-dynamic'${opts.dev ? " 'unsafe-eval'" : ""}${analytics}`,
    "style-src 'self' 'unsafe-inline'",
    // https://lujan.ir: تصویرهای محصولات واقعی که فعلاً از سایت فعلی خوانده می‌شوند (پیش‌نمایش در پنل)
    "img-src 'self' data: blob: https://lujan.ir",
    "font-src 'self'",
    `connect-src 'self'${analytics}${opts.dev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    `form-action 'self'${(opts.paymentOrigins ?? []).map((o) => ` ${o}`).join("")}`,
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    ...((opts.upgrade ?? !opts.dev) ? ["upgrade-insecure-requests"] : []),
  ];
  return directives.join("; ");
}

/** فقط مبدأ (scheme://host[:port]) از نشانی Umami؛ نشانی نامعتبر = بدون آمار */
export function originOf(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.origin : null;
  } catch {
    return null;
  }
}
