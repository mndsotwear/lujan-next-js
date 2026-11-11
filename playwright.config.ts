import { defineConfig, devices } from "@playwright/test";

// تست سرتاسری مسیرهای حیاتی (بخش ۱۲-۵، M1.11b). پروژه موبایل اول اجرا می‌شود (موبایل اول).
// با E2E_BASE_URL روی سرور آماده (مثلاً نسخه‌ی تولید روی ۳۱۲۳ از اسکریپت آزمون) اجرا می‌شود.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 1,
  workers: 1, // یک پایگاه داده‌ی مشترک؛ آزمون‌ها پشت سر هم
  reporter: [["list"], ["json", { outputFile: "e2e-report.json" }]],
  use: { baseURL, locale: "fa-IR", trace: "retain-on-failure" },
  ...(process.env.E2E_BASE_URL
    ? {}
    : {
        webServer: {
          command: "npm run build && npm run start",
          url: baseURL,
          reuseExistingServer: true,
          timeout: 180_000,
        },
      }),
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /perf|a11y/ },
  ],
});
