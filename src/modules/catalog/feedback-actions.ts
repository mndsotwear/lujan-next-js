"use server";
/** پرسش و نظر مشتری (FR-CAT-06، D-040) */
import { fa } from "@/content/fa";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/modules/account/server";
import { validQuestion, validReview } from "./feedback";

export type FeedbackState = { ok: boolean; message: string } | null;

export async function askQuestion(_prev: FeedbackState, form: FormData): Promise<FeedbackState> {
  const t = fa.product.ask;
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: t.login };
  const body = String(form.get("body") ?? "");
  if (!validQuestion(body)) return { ok: false, message: t.invalid };
  const today = await db.question.count({
    where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 86_400_000) } },
  });
  if (today >= 5) return { ok: false, message: t.tooMany };
  const product = await db.product.findUnique({
    where: { id: String(form.get("productId") ?? "") },
    select: { id: true },
  });
  if (!product) return { ok: false, message: fa.product.notifyError };
  await db.question.create({ data: { productId: product.id, userId: user.id, body: body.trim() } });
  return { ok: true, message: t.done };
}

/** وضعیت فرم‌ها برای کاربر فعلی — جدا از صفحه تا صفحه‌ی محصول قابل کش بماند */
export async function feedbackStatus(
  productId: string,
): Promise<{ loggedIn: boolean; canReview: boolean; reviewed: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { loggedIn: false, canReview: false, reviewed: false };
  const c = await canReview(user.id, productId);
  return { loggedIn: true, canReview: c.bought && !c.already, reviewed: c.already };
}

/** فقط خریدارِ سفارش تحویل‌شده؛ یک نظر برای هر محصول.
 * عمداً export نشده: هر export در فایل "use server" یک نقطه‌ی عمومی است و userId دلخواه می‌گیرد. */
async function canReview(userId: string, productId: string) {
  const [bought, existing] = await Promise.all([
    db.orderItem.findFirst({
      where: { order: { userId, status: "DELIVERED" }, variant: { productId } },
      select: { id: true },
    }),
    db.review.findUnique({
      where: { productId_userId: { productId, userId } },
      select: { id: true },
    }),
  ]);
  return { bought: !!bought, already: !!existing };
}

export async function submitReview(_prev: FeedbackState, form: FormData): Promise<FeedbackState> {
  const t = fa.product.review;
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: t.notBuyer };
  const productId = String(form.get("productId") ?? "");
  const rating = Number(form.get("rating"));
  const body = String(form.get("body") ?? "");
  if (!validReview(rating, body)) return { ok: false, message: t.invalid };
  const c = await canReview(user.id, productId);
  if (!c.bought) return { ok: false, message: t.notBuyer };
  if (c.already) return { ok: false, message: t.already };
  await db.review.create({
    data: { productId, userId: user.id, rating, body: body.trim() || null, isVerified: true },
  });
  return { ok: true, message: t.done };
}
