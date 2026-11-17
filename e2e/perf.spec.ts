/**
 * سرعت (NFR-PERF-01): LCP و CLS روی موبایل با شبکه‌ی ۴G کند و پردازنده‌ی ۴ برابر کندتر (همان تنظیم Lighthouse موبایل).
 * اندازه‌گیری آزمایشگاهی روی نسخه‌ی تولید محلی؛ عدد نهایی روی سرور آزمایشی (Staging) گرفته می‌شود.
 */
import { expect, test } from "@playwright/test";
import { writeFileSync } from "node:fs";

const PAGES = [
  "/",
  "/categories/instant-coffee",
  encodeURI("/products/چای-سیلانی-ممتاز-المنیس-450-گرم"),
  "/blog",
];
const results: Record<string, { lcp: number; cls: number; ttfb: number; transferKb: number }> = {};

test.afterAll(() => writeFileSync("perf-report.json", JSON.stringify(results, null, 2)));

for (const path of PAGES) {
  test(`سرعت ${path}`, async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "فقط Chromium");
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: (1638 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    // بار دوم سرد نیست؛ اولین بازدید معیار است
    await page.goto(path, { waitUntil: "load" });
    await page.waitForTimeout(2500);
    const m = await page.evaluate(
      () =>
        new Promise<{ lcp: number; cls: number; ttfb: number; transferKb: number }>((resolve) => {
          let lcp = 0;
          let cls = 0;
          new PerformanceObserver((l) => {
            for (const e of l.getEntries()) lcp = Math.max(lcp, e.startTime);
          }).observe({ type: "largest-contentful-paint", buffered: true });
          new PerformanceObserver((l) => {
            for (const e of l.getEntries() as (PerformanceEntry & {
              value: number;
              hadRecentInput: boolean;
            })[])
              if (!e.hadRecentInput) cls += e.value;
          }).observe({ type: "layout-shift", buffered: true });
          setTimeout(() => {
            const nav = performance.getEntriesByType(
              "navigation",
            )[0] as PerformanceNavigationTiming;
            const transfer = performance
              .getEntriesByType("resource")
              .reduce(
                (s, r) => s + ((r as PerformanceResourceTiming).transferSize || 0),
                nav.transferSize || 0,
              );
            resolve({
              lcp: Math.round(lcp),
              cls: Math.round(cls * 1000) / 1000,
              ttfb: Math.round(nav.responseStart),
              transferKb: Math.round(transfer / 1024),
            });
          }, 500);
        }),
    );
    results[path] = m;
    expect(m.lcp, `LCP ${path}`).toBeLessThan(2500);
    expect(m.cls, `CLS ${path}`).toBeLessThan(0.1);
  });
}
