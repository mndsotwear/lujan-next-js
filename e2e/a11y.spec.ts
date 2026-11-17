/** دسترسی‌پذیری (NFR بخش ۱۲، WCAG 2.1 AA) با axe — بدون خطای «جدی» یا «بحرانی» (M1.11b) */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

const PAGES = [
  "/",
  "/categories/instant-coffee",
  encodeURI("/products/چای-سیلانی-ممتاز-المنیس-450-گرم"),
  "/search?q=چای",
  "/cart",
  "/login",
  "/blog",
  "/track",
  "/contact",
];

// هر صفحه فایل جدا (بازاجرای آزمون فرایند را از نو شروع می‌کند)؛ در پایان یک گزارش جمع می‌شود
const DIR = "test-results/a11y";

test.afterAll(() => {
  const all: Record<string, unknown> = {};
  for (const f of readdirSync(DIR))
    all[decodeURIComponent(f.replace(/\.json$/, ""))] = JSON.parse(
      readFileSync(`${DIR}/${f}`, "utf8"),
    );
  writeFileSync("a11y-report.json", JSON.stringify(all, null, 2));
});

for (const path of PAGES) {
  test(`دسترسی‌پذیری ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    mkdirSync(DIR, { recursive: true });
    writeFileSync(
      `${DIR}/${encodeURIComponent(path)}.json`,
      JSON.stringify(
        r.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.slice(0, 8).map((n) => ({
            target: n.target.join(" "),
            summary: n.failureSummary?.slice(0, 200),
          })),
        })),
        null,
        2,
      ),
    );
    const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
  });
}
