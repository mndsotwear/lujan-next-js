"use server";
/** مدیریت پیشنهاد شگفت‌انگیز و بسته‌های ترکیبی (دسترسی «بازاریابی») */
import { revalidatePath } from "next/cache";
import { fa } from "@/content/fa";
import { expireCatalog } from "@/lib/cache";
import { db } from "@/lib/db";
import { toLatinDigits } from "@/lib/format";
import { parseJalali } from "@/lib/jalali";
import { audit, staffWith } from "@/modules/admin/server";

export type PromoState = { ok: boolean; message: string; values?: Record<string, string> } | null;

const values = (form: FormData) =>
  Object.fromEntries(
    [...form.entries()].filter(([, v]) => typeof v === "string").map(([k, v]) => [k, String(v)]),
  );
const ids = (form: FormData) =>
  [...new Set(form.getAll("productIds").map(String).filter(Boolean))].slice(0, 30);
const num = (v: string | undefined) => Number(toLatinDigits((v ?? "").trim()));

const refresh = () => {
  expireCatalog();
  revalidatePath("/", "layout");
  revalidatePath("/admin/marketing");
};

/** پایان پیشنهاد: تاریخ شمسی + ساعت (۰ تا ۲۳) به وقت تهران */
function endOf(dateRaw: string | undefined, hourRaw: string | undefined): Date | null {
  const day = parseJalali(dateRaw ?? "");
  if (!day) return null;
  const h = hourRaw?.trim() ? num(hourRaw) : 24;
  if (!Number.isInteger(h) || h < 0 || h > 24) return null;
  // parseJalali نیمه‌شب تهران همان روز را می‌دهد
  return new Date(day.getTime() + h * 3_600_000);
}

export async function saveDeals(_prev: PromoState, form: FormData): Promise<PromoState> {
  const t = fa.admin.marketing.deals;
  const me = await staffWith("marketing.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const v = values(form);
  const productIds = ids(form);
  const percent = num(v.percent);
  if (!productIds.length) return { ok: false, message: t.errors.products, values: v };
  if (!Number.isInteger(percent) || percent < 1 || percent > 90)
    return { ok: false, message: t.errors.percent, values: v };
  const startsAt = v.startsAt?.trim() ? parseJalali(v.startsAt) : null;
  if (v.startsAt?.trim() && !startsAt)
    return { ok: false, message: fa.admin.marketing.coupons.errors.dateFormat, values: v };
  const endsAt = endOf(v.endsAt, v.endHour);
  if (!endsAt) return { ok: false, message: t.errors.endsAt, values: v };
  if (endsAt <= new Date() || (startsAt && endsAt <= startsAt))
    return { ok: false, message: t.errors.past, values: v };
  await db.flashDeal.createMany({
    data: productIds.map((productId) => ({ productId, percent, startsAt, endsAt })),
  });
  await audit(me.id, "deal.create", "flashDeal", productIds.join(","), { percent });
  refresh();
  return { ok: true, message: t.saved };
}

/** ویرایش پیشنهاد موجود (درصد و زمان)، بدون حذف و ساخت دوباره */
export async function updateDeal(_prev: PromoState, form: FormData): Promise<PromoState> {
  const t = fa.admin.marketing.deals;
  const me = await staffWith("marketing.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const v = values(form);
  const old = await db.flashDeal.findUnique({ where: { id: v.id ?? "" } });
  if (!old) return { ok: false, message: t.errors.notFound, values: v };
  const percent = num(v.percent);
  if (!Number.isInteger(percent) || percent < 1 || percent > 90)
    return { ok: false, message: t.errors.percent, values: v };
  const startsAt = v.startsAt?.trim() ? parseJalali(v.startsAt) : null;
  if (v.startsAt?.trim() && !startsAt)
    return { ok: false, message: fa.admin.marketing.coupons.errors.dateFormat, values: v };
  const endsAt = endOf(v.endsAt, v.endHour);
  if (!endsAt) return { ok: false, message: t.errors.endsAt, values: v };
  if (endsAt <= new Date() || (startsAt && endsAt <= startsAt))
    return { ok: false, message: t.errors.past, values: v };
  await db.flashDeal.update({
    where: { id: old.id },
    data: { percent, startsAt, endsAt, isActive: v.isActive === "on" },
  });
  await audit(me.id, "deal.update", "flashDeal", old.id, { percent });
  refresh();
  return { ok: true, message: t.saved };
}

export async function toggleDeal(id: string, isActive: boolean) {
  const me = await staffWith("marketing.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  await db.flashDeal.update({ where: { id }, data: { isActive } });
  await audit(me.id, "deal.toggle", "flashDeal", id, { isActive });
  refresh();
  return { ok: true, message: fa.admin.marketing.deals.saved };
}

export async function deleteDeal(id: string) {
  const me = await staffWith("marketing.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  await db.flashDeal.delete({ where: { id } }).catch(() => null);
  await audit(me.id, "deal.delete", "flashDeal", id, {});
  refresh();
  return { ok: true, message: fa.admin.marketing.deals.saved };
}

export async function saveBundle(_prev: PromoState, form: FormData): Promise<PromoState> {
  const t = fa.admin.marketing.bundles;
  const me = await staffWith("marketing.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const v = values(form);
  const id = v.id || null;
  const title = (v.title ?? "").trim().slice(0, 60);
  const productIds = ids(form).slice(0, 4);
  const percent = num(v.percent);
  if (title.length < 2) return { ok: false, message: t.errors.title, values: v };
  if (productIds.length < 2) return { ok: false, message: t.errors.products, values: v };
  if (!Number.isInteger(percent) || percent < 1 || percent > 50)
    return { ok: false, message: t.errors.percent, values: v };
  const data = {
    title,
    percent,
    productIds,
    isActive: v.isActive === "on",
    sortOrder: num(v.sortOrder) || 0,
  };
  const b = id ? await db.bundle.update({ where: { id }, data }) : await db.bundle.create({ data });
  await audit(me.id, id ? "bundle.update" : "bundle.create", "bundle", b.id, { title, percent });
  refresh();
  return { ok: true, message: t.saved };
}

export async function deleteBundle(id: string) {
  const me = await staffWith("marketing.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  await db.bundle.delete({ where: { id } }).catch(() => null);
  await audit(me.id, "bundle.delete", "bundle", id, {});
  refresh();
  return { ok: true, message: fa.admin.marketing.bundles.saved };
}
