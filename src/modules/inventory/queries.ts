/** موجودی برای پنل (FR-INV-03, FR-INV-04) — فقط سرور */
import { db } from "@/lib/db";
import { availableQty } from "@/modules/catalog";
import { isLowStock } from "./rules";

export async function listInventory(filter: "all" | "low" | "out", q?: string) {
  const rows = await db.variant.findMany({
    where: q
      ? {
          OR: [
            { sku: { contains: q.toUpperCase() } },
            { product: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {},
    orderBy: [{ product: { name: "asc" } }, { sku: "asc" }],
    take: 5000, // صفحه‌بندی در صفحه‌ی پنل
    select: {
      id: true,
      sku: true,
      attributes: true,
      isActive: true,
      product: { select: { id: true, name: true, status: true } },
      inventory: true,
    },
  });
  return rows
    .filter((r) => r.inventory)
    .map((r) => ({ ...r, inventory: r.inventory!, available: availableQty(r.inventory!) }))
    .filter((r) =>
      filter === "out"
        ? r.available === 0
        : filter === "low"
          ? r.available > 0 && isLowStock(r.inventory)
          : true,
    );
}

export const stockHistory = (variantId: string) =>
  db.stockMovement.findMany({
    where: { variantId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

export async function lowStockCount() {
  const rows = await db.inventory.findMany({
    where: { variant: { isActive: true } },
    select: { onHand: true, reserved: true, safetyStock: true, lowStockThreshold: true },
  });
  return rows.filter(isLowStock).length;
}
