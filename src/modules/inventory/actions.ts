"use server";
/** ثبت دستی ورود و خروج کالا با دلیل و کاربر (FR-INV-03) و پیامک «موجود شد» (FR-CAT-04) */
import { revalidatePath } from "next/cache";
import { expireCatalog } from "@/lib/cache";
import { fa } from "@/content/fa";
import { db } from "@/lib/db";
import { toLatinDigits } from "@/lib/format";
import { audit, staffWith } from "@/modules/admin/server";
import { notifyBackInStock } from "./notify";
import {
  becameAvailable,
  isLowStock,
  signedDelta,
  validateAdjustment,
  type AdjustReason,
} from "./rules";

const t = fa.admin.inventory;
export type InvResult = { ok: boolean; message: string };

export async function adjustStock(
  variantId: string,
  reason: string,
  qtyInput: string,
  note: string,
): Promise<InvResult> {
  const me = await staffWith("inventory.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const qty = Number(toLatinDigits(qtyInput).replace(/[^\d-]/g, ""));
  const inv = await db.inventory.findUnique({ where: { variantId } });
  if (!inv) return { ok: false, message: fa.admin.catalog.errors.notFound };
  const delta = Number.isSafeInteger(qty) ? signedDelta(reason as AdjustReason, qty) : NaN;
  const err = validateAdjustment(delta, reason, note, inv);
  if (err) return { ok: false, message: t.errors[err] };

  // اتمی: فقط اگر هنوز «فیزیکی + تغییر ≥ رزرو» باشد (هم‌زمانی با سفارش آنلاین)
  const after = await db.$transaction(async (tx) => {
    const n =
      await tx.$executeRaw`UPDATE "Inventory" SET "onHand" = "onHand" + ${delta}, "updatedAt" = NOW()
      WHERE "variantId" = ${variantId} AND "onHand" + ${delta} >= "reserved"`;
    if (n !== 1) return null;
    await tx.stockMovement.create({
      data: {
        variantId,
        delta,
        reason: reason as AdjustReason,
        note: note.trim().slice(0, 300) || null,
        actorId: me.id,
      },
    });
    const fresh = await tx.inventory.findUniqueOrThrow({ where: { variantId } });
    // دوباره بالای آستانه: نشان پیامک کم‌موجودی پاک می‌شود (D-043)
    if (fresh.lowStockNotifiedAt && !isLowStock(fresh))
      await tx.inventory.update({ where: { variantId }, data: { lowStockNotifiedAt: null } });
    return fresh;
  });
  if (!after) return { ok: false, message: t.errors.negative };
  await audit(me.id, "stock.adjust", "variant", variantId, { delta, reason, onHand: after.onHand });

  let message: string = t.done;
  if (becameAvailable(inv, after)) {
    const n = await notifyBackInStock(variantId);
    if (n) message = `${t.done} ${t.notified(n)}`;
  }
  expireCatalog();
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products", "layout");
  return { ok: true, message };
}

export async function setThreshold(
  variantId: string,
  thresholdInput: string,
  safetyInput: string,
): Promise<InvResult> {
  const me = await staffWith("inventory.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const threshold = Number(toLatinDigits(thresholdInput));
  const safety = Number(toLatinDigits(safetyInput));
  if (![threshold, safety].every((n) => Number.isInteger(n) && n >= 0 && n <= 1000))
    return { ok: false, message: t.errors.threshold };
  await db.inventory.update({
    where: { variantId },
    data: { lowStockThreshold: threshold, safetyStock: safety },
  });
  await audit(me.id, "stock.threshold", "variant", variantId, { threshold, safety });
  expireCatalog();
  revalidatePath("/admin/inventory");
  return { ok: true, message: t.done };
}
