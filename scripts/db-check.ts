/** بررسی سلامت پایگاه داده — اجرا: npm run db:check */
import { db } from "../src/lib/db";
import { availableQty, stockState } from "../src/modules/catalog/stock";

async function main() {
  const [categories, brands, products, variants, rules, coupons] = await Promise.all([
    db.category.count(),
    db.brand.count(),
    db.product.count({ where: { status: "PUBLISHED" } }),
    db.variant.count(),
    db.recommendationRule.count(),
    db.coupon.count(),
  ]);
  const inv = await db.inventory.findMany();
  const states = { in_stock: 0, low: 0, out: 0 };
  for (const i of inv) states[stockState(i)]++;
  const p = await db.product.findUnique({
    where: { slug: "clipper-model-800" },
    include: { variants: { include: { inventory: true } }, rulesFrom: true },
  });
  console.log(
    `DB_OK categories=${categories} brands=${brands} products=${products} variants=${variants} rules=${rules} coupons=${coupons}`,
  );
  console.log(`STOCK in_stock=${states.in_stock} low=${states.low} out=${states.out}`);
  console.log(
    `SAMPLE ${p?.name} variants=${p?.variants.length} available=${p?.variants.map((v) => (v.inventory ? availableQty(v.inventory) : 0)).join("/")} rules=${p?.rulesFrom.length}`,
  );
}
main()
  .catch((e) => {
    console.error("DB_FAIL", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
