/** robots.txt — صفحه‌های خصوصی و پنل بیرون از نمایه (FR-SEO-02) */
import type { MetadataRoute } from "next";
import { absUrl, siteUrl } from "@/modules/seo";

export default function robots(): MetadataRoute.Robots {
  // روی نشانی آزمایشی (staging) هیچ صفحه‌ای نمایه نشود
  if (process.env.SEO_INDEX === "off") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/cart", "/checkout", "/pay", "/api", "/login"],
    },
    sitemap: absUrl("/sitemap.xml"),
    host: siteUrl(),
  };
}
