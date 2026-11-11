/**
 * پیش از هر صفحه: nonce تازه و سربرگ CSP (NFR-SEC-01، D-022، D-060).
 * Next.js nonce را از سربرگ درخواست می‌خواند و روی اسکریپت‌های خودش می‌گذارد؛ برای همین همه‌ی صفحه‌ها پویا هستند.
 */
import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, originOf } from "@/modules/seo/csp";

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp({
    nonce,
    dev: process.env.NODE_ENV === "development",
    // نسخه‌ی تولید روی http://localhost (آزمون) نباید درخواست‌ها را به https بفرستد
    upgrade: (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://"),
    analyticsOrigin: originOf(process.env.NEXT_PUBLIC_UMAMI_URL),
    // بازگشت از درگاه با redirect است، ولی برخی مرورگرها form-action را بر redirect هم اعمال می‌کنند
    paymentOrigins: [
      "https://www.zarinpal.com",
      "https://payment.zarinpal.com",
      "https://sandbox.zarinpal.com",
    ],
  });
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // فایل‌های ثابت، تصویرها و API به CSP صفحه نیاز ندارند
      source: "/((?!api|_next/static|_next/image|media|favicon.ico|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
