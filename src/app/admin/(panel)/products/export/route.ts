/**
 * خروجی همه‌ی نوع‌های محصول در قالب ورود (FR-ADM-02, FR-ADM-13، D-049) — ویرایش در اکسل و ورود دوباره.
 * ?format=xlsx|csv ؛ ?template=1 فقط سرستون. قیمت خرید فقط برای مدیر کل (D-050).
 */
import { toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { writeTable } from "@/lib/excel";
import { can } from "@/modules/admin";
import { staffWith } from "@/modules/admin/server";
import { IMPORT_COLUMNS, type ImportKey } from "@/modules/catalog";

export async function GET(req: Request) {
  const me = await staffWith("products.manage");
  if (!me) return new Response("Not found", { status: 404 });
  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const template = url.searchParams.get("template") === "1";
  const cols = IMPORT_COLUMNS.filter(([k]) => k !== "costPrice" || can(me.role, "products.price"));
  const variants = template
    ? []
    : await db.variant.findMany({
        orderBy: [{ product: { name: "asc" } }, { sku: "asc" }],
        include: {
          product: {
            include: { category: { select: { slug: true } }, brand: { select: { slug: true } } },
          },
          inventory: true,
          priceTiers: { where: { priceLevel: 1, minQty: 1 } },
        },
      });
  const value = (v: (typeof variants)[number], k: ImportKey): string | number | null => {
    switch (k) {
      case "sku":
        return v.sku;
      case "product":
        return v.product.slug;
      case "name":
        return v.product.name;
      case "category":
        return v.product.category.slug;
      case "brand":
        return v.product.brand.slug;
      case "attributes":
        return Object.entries((v.attributes ?? {}) as Record<string, string>)
          .map(([a, b]) => `${a}: ${b}`)
          .join("؛ ");
      case "price":
        return v.price;
      case "salePrice":
        return v.salePrice;
      case "wholesale":
        return v.priceTiers[0]?.price ?? null;
      case "costPrice":
        return v.costPrice;
      case "stock":
        return v.inventory?.onHand ?? 0;
      case "weightGrams":
        return v.weightGrams;
      case "active":
        return v.isActive ? "بله" : "خیر";
    }
  };
  const headers = cols.map(([, l]) => l);
  const rows = variants.map((v) => cols.map(([k]) => value(v, k)));
  const stamp = new Date().toISOString().slice(0, 10);
  const name = template ? "products-template" : `products-${stamp}`;
  if (format === "csv")
    return new Response(toCsv(headers, rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  const buf = await writeTable("محصولات", headers, rows);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
