"use server";
/** «موجود شد خبرم کن» (FR-CAT-04) — شماره در StockNotification ذخیره می‌شود؛ ارسال پیامک در M1.7. */
import { db } from "@/lib/db";
import { toLatinDigits } from "@/lib/format";
import { fa } from "@/content/fa";

export type NotifyState = { ok: boolean; message: string } | null;

export async function requestStockNotification(
  _prev: NotifyState,
  form: FormData,
): Promise<NotifyState> {
  const variantId = String(form.get("variantId") ?? "");
  const mobile = toLatinDigits(String(form.get("mobile") ?? "")).replace(/[\s-]/g, "");
  if (!/^09\d{9}$/.test(mobile)) return { ok: false, message: fa.product.notifyInvalidMobile };
  const variant = await db.variant.findUnique({ where: { id: variantId }, select: { id: true } });
  if (!variant) return { ok: false, message: fa.product.notifyError };
  await db.stockNotification.upsert({
    where: { variantId_mobile: { variantId, mobile } },
    update: { notifiedAt: null },
    create: { variantId, mobile },
  });
  return { ok: true, message: fa.product.notifyDone };
}
