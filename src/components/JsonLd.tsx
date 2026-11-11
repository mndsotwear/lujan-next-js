/** داده‌ی ساختاریافته‌ی Schema.org برای موتورهای جستجو (FR-SEO-03) */
import { jsonLdString } from "@/modules/seo";

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // خروجی JSON.stringify با فرار «<»؛ ورودی از داده‌ی خود سایت است
      dangerouslySetInnerHTML={{ __html: jsonLdString(data) }}
    />
  );
}
