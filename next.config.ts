import type { NextConfig } from "next";

const securityHeaders = [
  // NFR-SEC-01 — سربرگ‌های امنیتی پایه؛ CSP با nonce هر درخواست در src/proxy.ts (D-060)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  output: "standalone", // برای Docker و سرور داخل ایران
  // پشتیبان‌ها (داده‌ی مشتریان)، تصویرهای بارگذاری‌شده و ابزار توسعه هرگز داخل بسته‌ی استقرار نروند
  outputFileTracingExcludes: {
    "*": ["backups/**", "storage/**", "e2e/**", "ci/**", "*.log"],
  },
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"], // NFR-PERF-04
    // تصویرهای محصولات واقعی فعلاً از سایت فعلی lujan.ir خوانده می‌شوند
    remotePatterns: [
      { protocol: "https", hostname: "lujan.ir", pathname: "/wp-content/uploads/**" },
    ],
  },
  // تصویرهای مرجوعی: ۳ × ۴ مگابایت (D-030)؛ ویدیوی استوری تا ۲۵ مگابایت
  experimental: { serverActions: { bodySizeLimit: "30mb" } }, // ویدیوی استوری تا ۲۵ مگابایت
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
