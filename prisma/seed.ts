/**
 * بارگذاری داده‌ی نمونه — اجرا: npm run db:seed
 * قابل اجرای چندباره (upsert)؛ داده‌ی واقعی را پاک نمی‌کند مگر SKU یا slug یکسان باشد.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import { validateSpecs } from "../src/modules/catalog/specs";
import { brands, categories, coupons, products, recommendationRules } from "./seed-data";

const db = new PrismaClient();

async function main() {
  // ۱. اعتبارسنجی قبل از نوشتن (ریسک «کیفیت داده محصول»)
  const problems: string[] = [];
  for (const p of products) {
    const cat = categories.find((c) => c.slug === p.category);
    if (!cat) problems.push(`${p.slug}: دسته‌ی ${p.category} وجود ندارد`);
    else validateSpecs(cat.specSchema, p.specs).forEach((e) => problems.push(`${p.slug}: ${e}`));
    if (!brands.some((b) => b.slug === p.brand))
      problems.push(`${p.slug}: برند ${p.brand} وجود ندارد`);
  }
  if (problems.length) throw new Error("داده‌ی نمونه نامعتبر است:\n" + problems.join("\n"));

  // ۲. دسته‌ها و برندها
  for (const [i, c] of categories.entries()) {
    await db.category.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        icon: c.icon,
        sortOrder: i,
        specSchema: c.specSchema as unknown as Prisma.InputJsonValue,
      },
      create: {
        slug: c.slug,
        name: c.name,
        icon: c.icon,
        sortOrder: i,
        specSchema: c.specSchema as unknown as Prisma.InputJsonValue,
      },
    });
  }
  for (const b of brands) {
    await db.brand.upsert({ where: { slug: b.slug }, update: { name: b.name }, create: b });
  }
  const catId = new Map((await db.category.findMany()).map((c) => [c.slug, c.id]));
  const brandId = new Map((await db.brand.findMany()).map((b) => [b.slug, b.id]));

  // ۳. محصولات، تنوع‌ها، موجودی و قیمت عمده
  // وقتی محصولات واقعی lujan.ir وارد شده‌اند (SKU با LJ-)، نمونه‌ها بایگانی می‌مانند
  const hasReal = (await db.variant.count({ where: { sku: { startsWith: "LJ-" } } })) > 0;
  for (const p of products) {
    const data = {
      name: p.name,
      categoryId: catId.get(p.category)!,
      brandId: brandId.get(p.brand)!,
      summary: p.summary,
      description: p.description ?? null,
      specs: p.specs,
      warrantyMonths: p.warrantyMonths ?? null,
      tags: p.tags ?? [],
      status: hasReal ? ("ARCHIVED" as const) : ("PUBLISHED" as const),
      ratingAvg: p.rating?.[0] ?? 0,
      ratingCount: p.rating?.[1] ?? 0,
      soldCount: p.sold ?? 0,
    };
    const product = await db.product.upsert({
      where: { slug: p.slug },
      update: data,
      create: { slug: p.slug, ...data },
    });

    for (const v of p.variants) {
      const vData = {
        productId: product.id,
        attributes: v.attributes ?? {},
        price: v.price,
        salePrice: v.salePrice ?? null,
        weightGrams: v.weightGrams,
        lengthCm: v.dims?.[0] ?? null,
        widthCm: v.dims?.[1] ?? null,
        heightCm: v.dims?.[2] ?? null,
      };
      const variant = await db.variant.upsert({
        where: { sku: v.sku },
        update: vData,
        create: { sku: v.sku, ...vData },
      });
      await db.inventory.upsert({
        where: { variantId: variant.id },
        update: { onHand: v.onHand },
        create: { variantId: variant.id, onHand: v.onHand, lowStockThreshold: 3 },
      });
      if (v.wholesale) {
        await db.priceTier.upsert({
          where: {
            variantId_priceLevel_minQty: { variantId: variant.id, priceLevel: 1, minQty: 1 },
          },
          update: { price: v.wholesale },
          create: { variantId: variant.id, priceLevel: 1, minQty: 1, price: v.wholesale },
        });
      }
    }
  }

  // ۴. قوانین پیشنهاد مکمل
  const prodId = new Map(
    (await db.product.findMany({ select: { id: true, slug: true } })).map((p) => [p.slug, p.id]),
  );
  for (const [i, [from, to, label]] of recommendationRules.entries()) {
    const sourceProductId = prodId.get(from)!;
    const targetProductId = prodId.get(to)!;
    await db.recommendationRule.upsert({
      where: {
        sourceProductId_targetProductId_type: {
          sourceProductId,
          targetProductId,
          type: "COMPLEMENT",
        },
      },
      update: { reasonLabel: label, priority: 100 - i },
      create: {
        sourceProductId,
        targetProductId,
        type: "COMPLEMENT",
        reasonLabel: label,
        priority: 100 - i,
      },
    });
  }

  // ۵. کد تخفیف نمونه و کاربر مدیر نمونه
  for (const c of coupons) {
    await db.coupon.upsert({ where: { code: c.code }, update: c, create: c });
  }
  await db.user.upsert({
    where: { mobile: "09000000000" },
    update: {},
    create: { mobile: "09000000000", name: "مدیر نمونه", role: "ADMIN" },
  });

  // ۶. مقاله و صفحه‌ی فرود نمونه (M1.10b) — فقط اگر هنوز نیستند؛ پیش از راه‌اندازی حذف شوند
  const ids = async (slugs: string[]) =>
    (
      await db.product.findMany({
        where: { slug: { in: slugs } },
        select: { id: true, slug: true },
      })
    )
      .sort((a, b) => slugs.indexOf(a.slug) - slugs.indexOf(b.slug))
      .map((p) => p.id);
  const featured = await ids([
    "noodle-hot-chicken-140",
    "coffee-3in1-classic",
    "tea-black-leaf-500",
  ]);
  if (!(await db.post.findUnique({ where: { slug: "how-to-brew-instant-coffee" } })))
    await db.post.create({
      data: {
        slug: "how-to-brew-instant-coffee",
        title: "چطور قهوه فوری خوشمزه درست کنیم؟ (مطلب نمونه)",
        excerpt:
          "نسبت آب و قهوه، دمای آب و چند ترفند ساده برای اینکه قهوه فوری شما طعم کافه‌ای بدهد.",
        section: "guide",
        tags: ["قهوه فوری", "راهنمای خرید"],
        productIds: featured,
        status: "PUBLISHED",
        publishedAt: new Date(),
        body: [
          "این یک **مطلب نمونه** برای آزمایش مجله است و پیش از راه‌اندازی حذف می‌شود.",
          "",
          "## نسبت و دما",
          "- یک قاشق چای‌خوری قهوه برای ۱۵۰ میلی‌لیتر آب",
          "- آب را نزدیک جوش (نه جوش کامل) بریزید تا تلخی نکند",
          "",
          "## ترفند کف",
          "- یک قاشق قهوه و کمی شکر را با کمی آب خوب هم بزنید تا کف غلیظ شود",
          "- بعد شیر یا آب داغ را اضافه کنید",
          "",
        ].join("\n"),
      },
    });
  if (!(await db.landing.findUnique({ where: { slug: "sample-offer" } })))
    await db.landing.create({
      data: {
        slug: "sample-offer",
        title: "پیشنهاد ویژه‌ی لوجان (نمونه)",
        intro: "صفحه‌ی فرود **نمونه** برای آزمایش؛ پیش از راه‌اندازی حذف می‌شود.",
        productIds: featured,
        couponCode: coupons[0]?.code ?? null,
        isActive: true,
      },
    });

  const [nc, nb, np, nv, nr] = await Promise.all([
    db.category.count(),
    db.brand.count(),
    db.product.count(),
    db.variant.count(),
    db.recommendationRule.count(),
  ]);
  console.log(
    `✓ داده‌ی نمونه بارگذاری شد: ${nc} دسته، ${nb} برند، ${np} محصول، ${nv} تنوع (SKU)، ${nr} قانون پیشنهاد`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
