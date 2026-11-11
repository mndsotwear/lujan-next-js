"use server";
/** گردش‌کار مرجوعی توسط اپراتور (FR-RET-02، D-037..D-039) */
import { revalidatePath } from "next/cache";
import { expireCatalog } from "@/lib/cache";
import { fa } from "@/content/fa";
import { db } from "@/lib/db";
import { formatOrderNumber } from "@/lib/format";
import { audit, staffWith } from "@/modules/admin/server";
import { canMoveReturn, type AdminResult } from "@/modules/checkout";
import { recordRefund } from "@/modules/checkout/admin-actions";
import { sendOrderSms } from "@/modules/checkout/server";

const t = fa.admin.returns;

async function load(id: string) {
  return db.returnRequest.findUnique({
    where: { id },
    include: {
      items: { include: { orderItem: true } },
      order: { select: { id: true, number: true, user: { select: { mobile: true } } } },
    },
  });
}
type Loaded = NonNullable<Awaited<ReturnType<typeof load>>>;

const refresh = (r: Loaded) => {
  expireCatalog(); // ورود کالای سالم به موجودی
  revalidatePath(`/admin/returns/${r.id}`);
  revalidatePath("/admin/returns");
  revalidatePath("/admin/inbox");
  revalidatePath(`/admin/orders/${r.order.number}`);
  revalidatePath(`/account/orders/${r.order.number}`);
};

/** تغییر وضعیت با شرط وضعیت قبلی (دو اپراتور هم‌زمان) */
async function move(
  r: Loaded,
  to: Loaded["status"],
  data: { resolutionNote?: string | null; restocked?: boolean } = {},
) {
  const res = await db.returnRequest.updateMany({
    where: { id: r.id, status: r.status },
    data: { status: to, ...data },
  });
  return res.count === 1;
}

const cleanNote = (s: string) => s.trim().slice(0, 1000) || null;

export async function decideReturn(
  id: string,
  approve: boolean,
  note: string,
): Promise<AdminResult> {
  const me = await staffWith("returns.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const r = await load(id);
  const to = approve ? "APPROVED" : "REJECTED";
  if (!r || !canMoveReturn(r.status, to)) return { ok: false, message: t.notAllowed };
  if (!approve && !note.trim()) return { ok: false, message: t.reasonRequired };
  if (!(await move(r, to, { resolutionNote: cleanNote(note) })))
    return { ok: false, message: t.notAllowed };
  await audit(me.id, "return.decide", "order", r.order.id, {
    returnId: r.id,
    to,
    note: cleanNote(note),
  });
  const n = formatOrderNumber(r.order.number);
  await sendOrderSms(
    r.order.user.mobile,
    approve ? fa.admin.sms.returnApproved(n) : fa.admin.sms.returnRejected(n),
  );
  refresh(r);
  return { ok: true, message: fa.admin.orders.done };
}

/** کالا به فروشگاه رسید؛ سالم ← به موجودی (D-039) */
export async function receiveReturn(id: string, restock: boolean): Promise<AdminResult> {
  const me = await staffWith("returns.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const r = await load(id);
  if (!r || !canMoveReturn(r.status, "RECEIVED")) return { ok: false, message: t.notAllowed };
  const ok = await db.$transaction(async (tx) => {
    const res = await tx.returnRequest.updateMany({
      where: { id: r.id, status: r.status },
      data: { status: "RECEIVED", restocked: restock },
    });
    if (res.count !== 1) return false;
    if (restock)
      for (const it of r.items) {
        await tx.inventory.update({
          where: { variantId: it.orderItem.variantId },
          data: { onHand: { increment: it.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            variantId: it.orderItem.variantId,
            delta: it.quantity,
            reason: "RETURN",
            note: "کالای مرجوعی سالم",
            actorId: me.id,
            orderId: r.order.id,
          },
        });
      }
    return true;
  });
  if (!ok) return { ok: false, message: t.notAllowed };
  await audit(me.id, "return.receive", "order", r.order.id, { returnId: r.id, restock });
  refresh(r);
  return { ok: true, message: fa.admin.orders.done };
}

/** بازپرداخت مرجوعی: ثبت Refund + وضعیت «پول بازگردانده شد» */
export async function refundReturn(
  id: string,
  amount: string,
  reference: string,
): Promise<AdminResult> {
  const me = await staffWith("returns.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const r = await load(id);
  if (!r || !canMoveReturn(r.status, "REFUNDED")) return { ok: false, message: t.notAllowed };
  const res = await recordRefund(r.order.number, amount, reference, r.id);
  if (!res.ok) return res;
  await move(r, "REFUNDED");
  await audit(me.id, "return.refund", "order", r.order.id, { returnId: r.id });
  await markOrderReturnedIfComplete(r.order.id);
  refresh(r);
  return { ok: true, message: fa.admin.orders.done };
}

/** تعویض: کالای جایگزین از موجودی کم می‌شود؛ اگر موجود نیست، اجازه نمی‌دهد */
export async function exchangeReturn(id: string, note: string): Promise<AdminResult> {
  const me = await staffWith("returns.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const r = await load(id);
  if (!r || !canMoveReturn(r.status, "EXCHANGED")) return { ok: false, message: t.notAllowed };
  const result = await db
    .$transaction(async (tx) => {
      for (const it of r.items) {
        const n =
          await tx.$executeRaw`UPDATE "Inventory" SET "onHand" = "onHand" - ${it.quantity}, "updatedAt" = NOW()
        WHERE "variantId" = ${it.orderItem.variantId} AND "onHand" - "reserved" >= ${it.quantity}`;
        if (n !== 1) throw new Error("NO_STOCK");
        await tx.stockMovement.create({
          data: {
            variantId: it.orderItem.variantId,
            delta: -it.quantity,
            reason: "SALE_ONLINE",
            note: "کالای جایگزین تعویض",
            actorId: me.id,
            orderId: r.order.id,
          },
        });
      }
      const res = await tx.returnRequest.updateMany({
        where: { id: r.id, status: r.status },
        data: { status: "EXCHANGED", resolutionNote: cleanNote(note) ?? r.resolutionNote },
      });
      if (res.count !== 1) throw new Error("STALE");
      return "ok";
    })
    .catch((e: Error) => e.message);
  if (result === "NO_STOCK") return { ok: false, message: t.noStock };
  if (result !== "ok") return { ok: false, message: t.notAllowed };
  await audit(me.id, "return.exchange", "order", r.order.id, { returnId: r.id });
  await sendOrderSms(
    r.order.user.mobile,
    fa.admin.sms.exchanged(formatOrderNumber(r.order.number)),
  );
  refresh(r);
  return { ok: true, message: fa.admin.orders.done };
}

/** اگر همه‌ی اقلام سفارش بازپرداخت شده‌اند، سفارش «مرجوعی» می‌شود */
async function markOrderReturnedIfComplete(orderId: string) {
  const o = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      returns: { where: { status: "REFUNDED" }, include: { items: true } },
    },
  });
  if (!o || o.status !== "DELIVERED") return;
  const returned = new Map<string, number>();
  for (const r of o.returns)
    for (const i of r.items)
      returned.set(i.orderItemId, (returned.get(i.orderItemId) ?? 0) + i.quantity);
  if (o.items.every((i) => (returned.get(i.id) ?? 0) >= i.quantity))
    await db.order.update({ where: { id: o.id }, data: { status: "RETURNED" } });
}
