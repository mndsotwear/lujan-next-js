"use server";
/** پاسخ به پرسش و تأیید نظر در صندوق ورودی (FR-ADM-08، D-040) */
import { revalidatePath } from "next/cache";
import { expireCatalog } from "@/lib/cache";
import { fa } from "@/content/fa";
import { db } from "@/lib/db";
import { audit, staffWith } from "@/modules/admin/server";
import type { AdminResult } from "@/modules/checkout";
import { addRating } from "./feedback";

const refresh = (slug: string) => {
  expireCatalog();
  revalidatePath("/admin/inbox");
  revalidatePath(`/products/${slug}`);
};

export async function answerQuestion(id: string, answer: string): Promise<AdminResult> {
  const me = await staffWith("inbox.view");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const a = answer.trim().slice(0, 1000);
  if (a.length < 5) return { ok: false, message: fa.admin.inbox.answerRequired };
  const q = await db.question.findUnique({
    where: { id },
    include: { product: { select: { slug: true } } },
  });
  if (!q) return { ok: false, message: fa.admin.orders.notFound };
  await db.question.update({
    where: { id },
    data: { answer: a, answeredAt: new Date(), status: "APPROVED" },
  });
  await audit(me.id, "question.answer", "question", id);
  refresh(q.product.slug);
  return { ok: true, message: fa.admin.orders.done };
}

export async function rejectQuestion(id: string): Promise<AdminResult> {
  const me = await staffWith("inbox.view");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const q = await db.question.findUnique({
    where: { id },
    include: { product: { select: { slug: true } } },
  });
  if (!q) return { ok: false, message: fa.admin.orders.notFound };
  await db.question.update({ where: { id }, data: { status: "REJECTED" } });
  await audit(me.id, "question.reject", "question", id);
  refresh(q.product.slug);
  return { ok: true, message: fa.admin.orders.done };
}

export async function moderateReview(id: string, approve: boolean): Promise<AdminResult> {
  const me = await staffWith("inbox.view");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const r = await db.review.findUnique({ where: { id }, include: { product: true } });
  if (!r || r.status !== "PENDING") return { ok: false, message: fa.admin.returns.notAllowed };
  await db.$transaction(async (tx) => {
    await tx.review.update({ where: { id }, data: { status: approve ? "APPROVED" : "REJECTED" } });
    if (approve)
      await tx.product.update({
        where: { id: r.productId },
        data: addRating(r.product.ratingAvg, r.product.ratingCount, r.rating),
      });
  });
  await audit(me.id, approve ? "review.approve" : "review.reject", "review", id, {
    rating: r.rating,
  });
  refresh(r.product.slug);
  return { ok: true, message: fa.admin.orders.done };
}
