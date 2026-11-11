/**
 * قواعد مرجوعی (FR-RET-01، FR-RET-04، D-030) — منطق خالص.
 */
import { STORE } from "@/config/store";

export type ReturnReason =
  "DEFECTIVE" | "WRONG_ITEM" | "DAMAGED" | "NOT_AS_DESCRIBED" | "CHANGED_MIND";
export type ReturnType = "REFUND" | "EXCHANGE";
export type ReturnStatus =
  "REQUESTED" | "APPROVED" | "REJECTED" | "RECEIVED" | "REFUNDED" | "EXCHANGED";

export const RETURN_REASONS: ReturnReason[] = [
  "DEFECTIVE",
  "WRONG_ITEM",
  "DAMAGED",
  "NOT_AS_DESCRIBED",
  "CHANGED_MIND",
];
export const RETURN_TYPES: ReturnType[] = ["REFUND", "EXCHANGE"];

const DAY = 86_400_000;

export type Eligibility =
  | { ok: true; deadline: Date }
  | { ok: false; reason: "not_delivered" | "window_closed"; deadline: Date | null };

/** مهلت از زمان تحویل حساب می‌شود (برای تحویل حضوری، روز تحویل در فروشگاه) */
export function returnEligibility(
  order: { status: string; deliveredAt: Date | null },
  now = new Date(),
): Eligibility {
  if (order.status !== "DELIVERED" || !order.deliveredAt)
    return { ok: false, reason: "not_delivered", deadline: null };
  const deadline = new Date(order.deliveredAt.getTime() + STORE.returns.windowDays * DAY);
  return now.getTime() <= deadline.getTime()
    ? { ok: true, deadline }
    : { ok: false, reason: "window_closed", deadline };
}

/** هزینه‌ی ارسال برگشت با کیست (D-030) */
export const returnShippingPayer = (r: ReturnReason): "STORE" | "CUSTOMER" =>
  r === "CHANGED_MIND" ? "CUSTOMER" : "STORE";

/** تعداد قابل‌مرجوعِ هر قلم = خریده‌شده − درخواست‌های قبلیِ ردنشده */
export function returnableQuantities(
  items: { id: string; quantity: number }[],
  previous: { status: ReturnStatus; items: { orderItemId: string; quantity: number }[] }[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items) out[it.id] = it.quantity;
  for (const r of previous) {
    if (r.status === "REJECTED") continue;
    for (const ri of r.items)
      if (ri.orderItemId in out)
        out[ri.orderItemId] = Math.max(0, out[ri.orderItemId]! - ri.quantity);
  }
  return out;
}

export type ReturnInput = {
  items: { orderItemId: string; quantity: number }[];
  reasonCode: string;
  type: string;
  description: string;
  imageCount: number;
};
export type ReturnErrorKey =
  "items" | "qty" | "reason" | "type" | "description" | "images" | "imageRequired";

/** بررسی فرم؛ برای معیوب/آسیب‌دیده حداقل یک تصویر لازم است */
export function validateReturn(
  input: ReturnInput,
  returnable: Record<string, number>,
): ReturnErrorKey | null {
  const chosen = input.items.filter((i) => i.quantity > 0);
  if (!chosen.length) return "items";
  for (const i of chosen)
    if (!Number.isInteger(i.quantity) || i.quantity > (returnable[i.orderItemId] ?? 0))
      return "qty";
  if (!RETURN_REASONS.includes(input.reasonCode as ReturnReason)) return "reason";
  if (!RETURN_TYPES.includes(input.type as ReturnType)) return "type";
  const d = input.description.trim();
  if (d.length < 10 || d.length > 1000) return "description";
  if (input.imageCount > STORE.returns.maxImages) return "images";
  if (
    (input.reasonCode === "DEFECTIVE" || input.reasonCode === "DAMAGED") &&
    input.imageCount === 0
  )
    return "imageRequired";
  return null;
}

/** نوع تصویر از چند بایت اول (نه از نام فایل): JPEG، PNG، WebP */
export function sniffImage(head: Uint8Array): "jpg" | "png" | "webp" | null {
  const b = (i: number) => head[i] ?? -1;
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return "jpg";
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return "png";
  const ascii = (from: number, to: number) => String.fromCharCode(...head.slice(from, to));
  if (head.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  return null;
}

/** نام فایل ذخیره‌شده: فقط حروف و ارقام + پسوند مجاز (جلوگیری از پیمایش مسیر) */
export const isSafeImageName = (name: string) => /^[a-z0-9]{16,40}\.(jpg|png|webp)$/.test(name);
