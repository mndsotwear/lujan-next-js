"use server";
/** کد تخفیف در پنل (FR-ADM-06، D-047) */
import { revalidatePath } from "next/cache";
import { fa } from "@/content/fa";
import { db } from "@/lib/db";
import { parseJalali } from "@/lib/jalali";
import { audit, staffWith } from "@/modules/admin/server";
import { parseAmount } from "@/modules/catalog";
import { normalizeCode, validateCouponForm, type CouponForm } from "./coupon";

export type CouponState = { ok: boolean; message: string; values?: Record<string, string> } | null;

export async function saveCoupon(_prev: CouponState, form: FormData): Promise<CouponState> {
  const t = fa.admin.marketing.coupons;
  const me = await staffWith("marketing.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const values = Object.fromEntries(
    [...form.entries()].filter(([, v]) => typeof v === "string").map(([k, v]) => [k, String(v)]),
  );
  const num = (k: string) => {
    const n = parseAmount(values[k]);
    return n === null || Number.isNaN(n) ? (values[k]?.trim() ? -1 : null) : n;
  };
  const startsRaw = values.startsAt?.trim() ?? "";
  const endsRaw = values.endsAt?.trim() ?? "";
  const startsAt = startsRaw ? parseJalali(startsRaw) : null;
  const endsAt = endsRaw ? parseJalali(endsRaw, true) : null;
  if ((startsRaw && !startsAt) || (endsRaw && !endsAt))
    return { ok: false, message: t.errors.dateFormat, values };
  const input: CouponForm = {
    code: normalizeCode(values.code ?? ""),
    type: values.type ?? "",
    value: values.type === "FREE_SHIPPING" ? 0 : num("value"),
    minSubtotal: num("minSubtotal"),
    maxDiscount: num("maxDiscount"),
    usageLimit: num("usageLimit"),
    perCustomerLimit: num("perCustomerLimit"),
    startsAt,
    endsAt,
  };
  const err = validateCouponForm(input);
  if (err) return { ok: false, message: t.errors[err], values };
  const id = values.id || null;
  const clash = await db.coupon.findUnique({ where: { code: input.code }, select: { id: true } });
  if (clash && clash.id !== id) return { ok: false, message: t.errors.taken, values };
  const data = {
    code: input.code,
    type: input.type as "PERCENT" | "FIXED" | "FREE_SHIPPING",
    value: input.value ?? 0,
    minSubtotal: input.minSubtotal ?? 0,
    maxDiscount: input.maxDiscount,
    usageLimit: input.usageLimit,
    perCustomerLimit: input.perCustomerLimit,
    startsAt,
    endsAt,
    isActive: values.isActive === "on",
  };
  const c = id ? await db.coupon.update({ where: { id }, data }) : await db.coupon.create({ data });
  await audit(me.id, id ? "coupon.update" : "coupon.create", "coupon", c.id, {
    code: c.code,
    type: c.type,
    value: c.value,
    isActive: c.isActive,
  });
  revalidatePath("/admin/marketing");
  return { ok: true, message: t.saved, values: id ? values : undefined };
}
