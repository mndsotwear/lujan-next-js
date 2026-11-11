"use server";
/** ثبت درخواست مرجوعی یا تعویض (FR-RET-01) */
import { revalidatePath } from "next/cache";
import { STORE } from "@/config/store";
import { fa } from "@/content/fa";
import { db } from "@/lib/db";
import { isValidIban, normalizeIban } from "@/modules/account";
import { getCurrentUser, sealIban } from "@/modules/account/server";
import {
  returnableQuantities,
  returnEligibility,
  sniffImage,
  validateReturn,
  type ReturnReason,
  type ReturnType,
} from "./policy";
import { saveReturnImage } from "./storage";

export type ReturnFormValues = {
  qty: Record<string, number>;
  reasonCode: string;
  type: string;
  description: string;
  iban: string;
};
/** values: آنچه مشتری وارد کرده تا پس از خطا فرم پاک نشود (تصویرها را مرورگر نگه نمی‌دارد) */
export type ReturnFormState = { ok: boolean; message: string; values?: ReturnFormValues } | null;

export async function requestReturn(
  _prev: ReturnFormState,
  form: FormData,
): Promise<ReturnFormState> {
  const t = fa.returns.errors;
  const qty: Record<string, number> = {};
  for (const [k, v] of form.entries()) if (k.startsWith("qty_")) qty[k.slice(4)] = Number(v) || 0;
  const values: ReturnFormValues = {
    qty,
    reasonCode: String(form.get("reasonCode") ?? ""),
    type: String(form.get("type") ?? ""),
    description: String(form.get("description") ?? ""),
    iban: String(form.get("iban") ?? ""),
  };
  const fail = (message: string): ReturnFormState => ({ ok: false, message, values });
  const user = await getCurrentUser();
  if (!user) return fail(t.login);
  const number = Number(form.get("orderNumber"));
  const order = Number.isSafeInteger(number)
    ? await db.order.findFirst({
        where: { number, userId: user.id },
        include: { items: true, returns: { include: { items: true } } },
      })
    : null;
  if (!order) return fail(t.notFound);
  const elig = returnEligibility(order);
  if (!elig.ok) return fail(t[elig.reason]);

  const returnable = returnableQuantities(order.items, order.returns);
  const items = order.items.map((it) => ({
    orderItemId: it.id,
    quantity: qty[it.id] ?? 0,
  }));
  const files = form
    .getAll("images")
    .filter((f): f is File => typeof f === "object" && "arrayBuffer" in f && f.size > 0);
  const input = { items, ...values, imageCount: files.length };
  const err = validateReturn(input, returnable);
  if (err) return fail(t[err]);
  // بازگشت پول: شبای مقصد لازم است (D-041)
  const iban = normalizeIban(values.iban);
  if (values.type === "REFUND" && !isValidIban(iban)) return fail(t.iban);

  // تصویرها: نوع از محتوا، نه از نام یا Content-Type مرورگر
  const images: { bytes: Uint8Array; ext: string }[] = [];
  for (const f of files) {
    if (f.size > STORE.returns.maxImageBytes) return fail(t.imageSize);
    const bytes = new Uint8Array(await f.arrayBuffer());
    const ext = sniffImage(bytes.subarray(0, 16));
    if (!ext) return fail(t.imageType);
    images.push({ bytes, ext });
  }
  const names: string[] = [];
  for (const img of images) names.push(await saveReturnImage(img.bytes, img.ext));

  await db.returnRequest.create({
    data: {
      orderId: order.id,
      reasonCode: input.reasonCode as ReturnReason,
      type: input.type as ReturnType,
      reason: input.description.trim(),
      imageUrls: names,
      refundIban: values.type === "REFUND" ? sealIban(iban) : null,
      items: { create: items.filter((i) => i.quantity > 0) },
    },
  });
  // اگر شبا در حساب ذخیره نشده، برای دفعه‌های بعد ذخیره می‌شود
  if (values.type === "REFUND")
    await db.user.updateMany({
      where: { id: user.id, refundIban: null },
      data: { refundIban: sealIban(iban) },
    });
  revalidatePath(`/account/orders/${order.number}`);
  return { ok: true, message: fa.returns.submitted };
}
