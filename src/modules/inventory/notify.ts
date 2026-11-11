/** پیامک «موجود شد» به منتظران (FR-CAT-04) و خلاصه‌ی کم‌موجودی (D-043) — فقط سرور */
import { fa } from "@/content/fa";
import { db } from "@/lib/db";
import { getSmsSender, maskMobile } from "@/modules/account/server";
import { lowStockChanges } from "./rules";

export async function notifyBackInStock(variantId: string): Promise<number> {
  const waiting = await db.stockNotification.findMany({
    where: { variantId, notifiedAt: null },
    include: { variant: { select: { product: { select: { name: true } } } } },
  });
  const sms = getSmsSender();
  let sent = 0;
  for (const w of waiting) {
    try {
      await sms.sendText(w.mobile, fa.admin.inventory.sms.backInStock(w.variant.product.name));
      await db.stockNotification.update({ where: { id: w.id }, data: { notifiedAt: new Date() } });
      sent++;
    } catch (e) {
      console.error("back-in-stock sms failed", maskMobile(w.mobile), e);
    }
  }
  return sent;
}

/** یک پیامک خلاصه به مدیر کل و انباردارها فقط برای کالاهای تازه کم‌موجود */
export async function sendLowStockDigest(): Promise<{ notified: number; cleared: number }> {
  const rows = await db.inventory.findMany({
    where: { variant: { isActive: true, product: { status: "PUBLISHED" } } },
    include: { variant: { select: { sku: true } } },
  });
  const { notify, clear } = lowStockChanges(rows);
  if (clear.length)
    await db.inventory.updateMany({
      where: { id: { in: clear } },
      data: { lowStockNotifiedAt: null },
    });
  if (!notify.length) return { notified: 0, cleared: clear.length };
  const staff = await db.user.findMany({
    where: {
      role: { in: ["ADMIN", "WAREHOUSE"] },
      staffDisabledAt: null,
      deletedAt: null,
      totpEnabledAt: { not: null },
    },
    select: { mobile: true },
  });
  const list =
    notify
      .map((r) => r.variant.sku)
      .slice(0, 8)
      .join("، ") + (notify.length > 8 ? "، …" : "");
  const text = fa.admin.inventory.sms.lowStock(notify.length, list);
  const sms = getSmsSender();
  for (const s of staff)
    await sms
      .sendText(s.mobile, text)
      .catch((e) => console.error("low-stock sms failed", maskMobile(s.mobile), e));
  await db.inventory.updateMany({
    where: { id: { in: notify.map((r) => r.id) } },
    data: { lowStockNotifiedAt: new Date() },
  });
  return { notified: notify.length, cleared: clear.length };
}
