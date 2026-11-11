/** اسکریپت Umami فقط وقتی تنظیم شده (D-054)؛ پارامترهای نشانی ثبت نمی‌شوند تا توکن لغو و جستجو نشت نکند */
import { headers } from "next/headers";
import Script from "next/script";

export async function Analytics() {
  const url = process.env.NEXT_PUBLIC_UMAMI_URL?.replace(/\/+$/, "");
  const id = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  if (!url || !id || !/^https?:\/\//.test(url)) return null;
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <Script
      src={`${url}/script.js`}
      data-website-id={id}
      data-exclude-search="true"
      data-do-not-track="true"
      strategy="afterInteractive"
      nonce={nonce}
    />
  );
}
