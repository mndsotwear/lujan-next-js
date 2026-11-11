import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import "@fontsource-variable/vazirmatn"; // D-004 — فونت محلی، بدون وابستگی به Google Fonts
import "./globals.css";
import { fa } from "@/content/fa";
import { THEME_COLOR } from "@/lib/theme";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: fa.site.name, template: `%s | ${fa.site.name}` },
  description: fa.site.description,
  applicationName: fa.site.name,
  openGraph: { siteName: fa.site.name, locale: "fa_IR", type: "website" },
  formatDetection: { telephone: false },
};

export function generateViewport(): Viewport {
  return {
    width: "device-width",
    initialScale: 1,
    themeColor: THEME_COLOR.store,
    colorScheme: "light",
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // همه‌ی صفحه‌ها در لحظه‌ی درخواست ساخته می‌شوند تا nonce سیاست امنیت محتوا روی اسکریپت‌ها بنشیند (D-060)
  await connection();
  return (
    <html lang="fa" dir="rtl" data-theme="light">
      <body className="bg-bg text-ink min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
