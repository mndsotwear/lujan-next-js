/** مسیر حیاتی خرید: ورود ← آدرس ← سبد ← تسویه ← درگاه آزمایشی ← پیگیری (FR-CHK، M1.11b) */
import { expect, test } from "@playwright/test";
import { freshMobile, login } from "./helpers";

test("خرید کامل با پرداخت آنلاین آزمایشی و پیگیری سفارش", async ({ page }) => {
  const mobile = freshMobile();
  await login(page, mobile);

  // آدرس
  await page.goto("/account/addresses");
  await page.getByText("افزودن آدرس").first().click();
  await page.locator("#f-title").fill("خانه");
  await page.locator("#f-province").selectOption("تهران");
  await page.locator("#f-city").fill("تهران");
  await page.locator("#f-line").fill("خیابان آزمون سرتاسری، پلاک ۱۰، واحد ۲");
  await page.locator("#f-postalCode").fill("1318743911");
  await page.locator("#f-recipient").fill("آزمون خودکار");
  await page.locator("#f-phone").fill(mobile);
  await page.getByRole("button", { name: "ذخیره" }).first().click();
  await expect(page.locator("main")).toContainText("خیابان آزمون سرتاسری");

  // سبد
  await page.goto("/products/tea-black-leaf-500");
  await page.getByRole("button", { name: "افزودن به سبد" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();

  // تسویه
  await page.goto("/checkout");
  await page.getByText("پست پیشتاز").first().click();
  await page.getByText("قوانین فروشگاه و شرایط مرجوعی را می‌پذیرم.").click();
  await page.getByRole("button", { name: /^پرداخت/ }).click();

  // درگاه آزمایشی
  await page.waitForURL(/\/pay\/mock/);
  await page.getByRole("link", { name: "پرداخت موفق" }).click(); // در درگاه آزمایشی پیوند است
  await page.waitForURL(/\/checkout\/result\/\d+/);
  await expect(page.locator("main")).toContainText("پرداخت موفق بود");
  const number = page.url().match(/result\/(\d+)/)![1]!;

  // پیگیری مهمان با شماره‌ی سفارش و موبایل
  await page.goto("/track");
  await page.locator("main input").nth(0).fill(number);
  await page.locator("main input").nth(1).fill(mobile);
  await page.getByRole("button", { name: "پیگیری" }).click();
  await expect(page.locator("main")).toContainText(
    `سفارش ${number.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!)}`,
  );
});

test("علاقه‌مندی: مهمان به ورود می‌رود؛ پس از ورود ذخیره می‌شود", async ({ page }) => {
  await page.goto("/products/tea-black-leaf-500");
  await page.getByRole("button", { name: "افزودن به علاقه‌مندی‌ها" }).click();
  await page.waitForURL(/\/login/);
  await login(page, freshMobile(), "/products/tea-black-leaf-500");
  await page.getByRole("button", { name: "افزودن به علاقه‌مندی‌ها" }).click();
  await expect(page.getByRole("button", { name: "در علاقه‌مندی‌ها" })).toBeVisible();
  await page.goto("/account/wishlist");
  await expect(page.locator("main")).toContainText("چای سیاه برگی");
});
