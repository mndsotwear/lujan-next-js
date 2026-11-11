"use server";
/**
 * ورود گروهی از اکسل/CSV: پیش‌نمایش ← اعمال (FR-ADM-02، D-049).
 * فایل خام در storage/imports نگه داشته می‌شود و هنگام «اعمال» دوباره با داده‌ی تازه‌ی پایگاه سنجیده می‌شود.
 */
import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { expireCatalog } from "@/lib/cache";
import { fa } from "@/content/fa";
import { db } from "@/lib/db";
import { readTable } from "@/lib/excel";
import { can } from "@/modules/admin";
import { audit, staffWith } from "@/modules/admin/server";
import { resetSearchCache } from "@/modules/search/server";
import { planImport, summarizePlan, toRawRows, type PlanRow, type RawRow } from "./import-rules";

const dir = () =>
  path.join(process.env.UPLOAD_DIR ?? path.join(process.cwd(), "storage"), "imports");
const MAX_BYTES = 3 * 1024 * 1024;
const MAX_ROWS = 2000;
const TTL_MS = 30 * 60_000;

export type ImportPreview =
  | { ok: false; message: string }
  | { ok: true; token: string; summary: ReturnType<typeof summarizePlan>; rows: PlanRow[] };

async function context(canPrice: boolean) {
  const [variants, products, categories, brands] = await Promise.all([
    db.variant.findMany({
      include: {
        product: { select: { slug: true } },
        inventory: true,
        priceTiers: { where: { priceLevel: 1, minQty: 1 } },
      },
    }),
    db.product.findMany({ select: { slug: true } }),
    db.category.findMany({ select: { slug: true } }),
    db.brand.findMany({ select: { slug: true } }),
  ]);
  return {
    variants: new Map(
      variants.map((v) => [
        v.sku,
        {
          sku: v.sku,
          productSlug: v.product.slug,
          price: v.price,
          salePrice: v.salePrice,
          wholesale: v.priceTiers[0]?.price ?? null,
          costPrice: v.costPrice,
          onHand: v.inventory?.onHand ?? 0,
          reserved: v.inventory?.reserved ?? 0,
          weightGrams: v.weightGrams,
          isActive: v.isActive,
          attributes: (v.attributes ?? {}) as Record<string, string>,
        },
      ]),
    ),
    productSlugs: new Set(products.map((p) => p.slug)),
    categories: new Set(categories.map((c) => c.slug)),
    brands: new Set(brands.map((b) => b.slug)),
    canPrice,
  };
}

export async function previewImport(form: FormData): Promise<ImportPreview> {
  const t = fa.admin.importer;
  const me = await staffWith("products.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const file = form.get("file");
  if (!file || typeof file !== "object" || !("arrayBuffer" in file) || file.size === 0)
    return { ok: false, message: t.errors.file };
  if (file.size > MAX_BYTES) return { ok: false, message: t.errors.size };
  let table: string[][];
  try {
    table = await readTable(new Uint8Array(await file.arrayBuffer()));
  } catch {
    return { ok: false, message: t.errors.read };
  }
  const { rows, missingSku } = toRawRows(table);
  if (missingSku) return { ok: false, message: t.errors.header };
  if (!rows.length) return { ok: false, message: t.errors.empty };
  if (rows.length > MAX_ROWS) return { ok: false, message: t.errors.rows(MAX_ROWS) };
  const plan = planImport(rows, await context(can(me.role, "products.price")));
  const token = randomBytes(12).toString("hex");
  await mkdir(dir(), { recursive: true });
  await writeFile(
    path.join(dir(), `${token}.json`),
    JSON.stringify({ actorId: me.id, createdAt: Date.now(), rows }),
  );
  return { ok: true, token, summary: summarizePlan(plan), rows: plan.slice(0, 500) };
}

export async function applyImport(token: string): Promise<{ ok: boolean; message: string }> {
  const t = fa.admin.importer;
  const me = await staffWith("products.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  if (!/^[a-f0-9]{24}$/.test(token)) return { ok: false, message: t.errors.expired };
  const file = path.join(dir(), `${token}.json`);
  const saved = await readFile(file, "utf8")
    .then((s) => JSON.parse(s) as { actorId: string; createdAt: number; rows: RawRow[] })
    .catch(() => null);
  if (!saved || saved.actorId !== me.id || Date.now() - saved.createdAt > TTL_MS)
    return { ok: false, message: t.errors.expired };
  const canPrice = can(me.role, "products.price");
  // دوباره با داده‌ی تازه: اگر از پیش‌نمایش تا حالا چیزی عوض شده، همان لحظه سنجیده می‌شود
  const plan = planImport(saved.rows, await context(canPrice));
  const todo = plan.filter((p) => p.action !== "error" && p.action !== "unchanged");
  const priceLog: {
    sku: string;
    field: string;
    from: string | number | boolean | null;
    to: string | number | boolean | null;
  }[] = [];

  await db.$transaction(
    async (tx) => {
      const cats = new Map((await tx.category.findMany()).map((c) => [c.slug, c.id]));
      const brands = new Map((await tx.brand.findMany()).map((b) => [b.slug, b.id]));
      for (const p of todo) {
        const d = p.data!;
        let productId: string;
        if (p.action === "create-product") {
          const existing = await tx.product.findUnique({ where: { slug: d.productSlug } });
          productId =
            existing?.id ??
            (
              await tx.product.create({
                data: {
                  slug: d.productSlug,
                  name: d.name!,
                  categoryId: cats.get(d.category!)!,
                  brandId: brands.get(d.brand!)!,
                  status: "DRAFT",
                },
              })
            ).id;
        } else {
          productId = (await tx.product.findUniqueOrThrow({ where: { slug: d.productSlug } })).id;
        }
        const variantData = {
          ...(d.price !== undefined ? { price: d.price } : {}),
          ...(d.salePrice !== undefined ? { salePrice: d.salePrice } : {}),
          ...(d.costPrice !== undefined ? { costPrice: d.costPrice } : {}),
          ...(d.weightGrams !== undefined ? { weightGrams: d.weightGrams } : {}),
          ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
          ...(d.attributes !== undefined ? { attributes: d.attributes } : {}),
        };
        const v =
          p.action === "update"
            ? await tx.variant.update({ where: { sku: p.sku }, data: variantData })
            : await tx.variant.create({
                data: {
                  sku: p.sku,
                  productId,
                  price: 0,
                  ...variantData,
                  inventory: { create: { onHand: 0 } },
                },
              });
        if (d.wholesale !== undefined) {
          if (d.wholesale === null)
            await tx.priceTier.deleteMany({ where: { variantId: v.id, priceLevel: 1, minQty: 1 } });
          else
            await tx.priceTier.upsert({
              where: { variantId_priceLevel_minQty: { variantId: v.id, priceLevel: 1, minQty: 1 } },
              update: { price: d.wholesale },
              create: { variantId: v.id, priceLevel: 1, minQty: 1, price: d.wholesale },
            });
        }
        if (d.stock !== undefined) {
          const inv = await tx.inventory.findUniqueOrThrow({ where: { variantId: v.id } });
          const delta = d.stock - inv.onHand;
          if (delta !== 0) {
            await tx.inventory.update({ where: { variantId: v.id }, data: { onHand: d.stock } });
            await tx.stockMovement.create({
              data: {
                variantId: v.id,
                delta,
                reason: "ADJUSTMENT",
                note: "ورود اکسل",
                actorId: me.id,
              },
            });
          }
        }
        for (const c of p.changes)
          if (["price", "salePrice", "wholesale", "costPrice"].includes(c.field))
            priceLog.push({ sku: p.sku, field: c.field, from: c.from, to: c.to });
      }
    },
    { timeout: 60_000 },
  );

  const summary = summarizePlan(plan);
  await audit(me.id, "product.import", "product", null, {
    ...summary,
    prices: priceLog.slice(0, 100),
  });
  if (priceLog.length)
    await audit(me.id, "product.price", "product", null, {
      import: true,
      changes: priceLog.slice(0, 100),
    });
  await unlink(file).catch(() => {});
  resetSearchCache();
  expireCatalog();
  revalidatePath("/admin/products", "layout");
  revalidatePath("/", "layout");
  return { ok: true, message: t.applied(todo.length, summary.error) };
}
