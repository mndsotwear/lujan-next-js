/** کمک‌های آزمون سرتاسری (M1.11b) */
import { expect, type Page } from "@playwright/test";

/** موبایل یکتا برای هر اجرا تا محدودیت نرخ پیامک به هم نخورد */
export const freshMobile = () => `0912${String(Date.now()).slice(-7)}`;

/** ورود با کد ثابت آزمون (E2E_OTP، فقط در حالت پیامک توسعه) */
export async function login(page: Page, mobile: string, next = "/account") {
  const code = process.env.E2E_OTP ?? "13579";
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.locator("#mobile").fill(mobile);
  await page.getByRole("button", { name: "دریافت کد" }).click();
  await page.locator("#code").fill(code);
  await page.waitForURL((u) => u.pathname === next, { timeout: 15_000 });
}

/** بدون اسکرول افقی (موبایل اول) */
export async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(overflow, "اسکرول افقی").toBe(false);
}
