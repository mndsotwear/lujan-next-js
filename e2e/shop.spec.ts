/** مرور فروشگاه: دسته، جستجو، محصول، سبد، مجله، ۴۰۴ (M1.11b) */
import { expect, test } from "@playwright/test";
import { noHorizontalScroll } from "./helpers";

test("دسته: فیلتر و مرتب‌سازی، بدون اسکرول افقی", async ({ page }) => {
  await page.goto("/categories/instant-coffee");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("قهوه فوری");
  const all = await page.locator('main a[href^="/products/"]').count();
  expect(all).toBeGreaterThan(0);
  await page.goto("/categories/instant-coffee?sort=price-asc&instock=1");
  await expect(page.locator('main a[href^="/products/"]').first()).toBeVisible();
  await noHorizontalScroll(page);
});

test("جستجو با مترادف: نسکافه، قهوه فوری پیدا می‌کند", async ({ page }) => {
  await page.goto("/search?q=نسکافه");
  // در موبایل منوی دسته‌های سربرگ پنهان است؛ نتیجه داخل main بررسی می‌شود
  await expect(page.locator("main").getByText("قهوه فوری").first()).toBeVisible();
  await page.goto("/search?q=zzzz-no-such-thing");
  await expect(page.getByText("کالایی پیدا نشد", { exact: false })).toBeVisible();
});

test("محصول: داده‌ی ساختاریافته و افزودن به سبد", async ({ page }) => {
  await page.goto("/products/tea-black-leaf-500");
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.map((x) => JSON.parse(x)["@type"])).toContain("Product");
  await page.getByRole("button", { name: "افزودن به سبد" }).first().click();
  await expect(page.getByRole("dialog")).toContainText("چای سیاه برگی");
  await page.goto("/cart");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("سبد خرید");
  await expect(page.locator("main")).toContainText("چای سیاه برگی");
  await noHorizontalScroll(page);
});

test("مجله و صفحه‌ی فرود باز می‌شوند", async ({ page }) => {
  await page.goto("/blog");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("مجله");
  await page.goto("/offers/sample-offer");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("صفحه‌ی ناموجود ۴۰۴ واقعی", async ({ page }) => {
  const r = await page.goto("/no-such-page-e2e");
  expect(r?.status()).toBe(404);
});

test("سربرگ‌های امنیتی و CSP با nonce", async ({ page }) => {
  const r = await page.goto("/");
  const csp = r?.headers()["content-security-policy"] ?? "";
  expect(csp).toContain("'strict-dynamic'");
  expect(r?.headers()["x-frame-options"]).toBe("DENY");
  const violations: string[] = [];
  page.on(
    "console",
    (m) => m.text().includes("Content Security Policy") && violations.push(m.text()),
  );
  await page.reload();
  await page.waitForLoadState("networkidle");
  expect(violations).toEqual([]);
});

test("فروشگاه همیشه لایت است و دکمه‌ی تغییر تم ندارد", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("button", { name: "حالت تیره", exact: true })).toHaveCount(0);
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(245, 248, 252)");
});

test("پنل مدیریت: تم تیره‌ی لیکوئید گلس", async ({ page }) => {
  await page.goto("/admin/login");
  const root = page.locator(".admin-glass").first();
  await expect(root).toBeVisible();
  const scheme = await root.evaluate((el) => getComputedStyle(el).colorScheme);
  expect(scheme).toBe("dark");
});
