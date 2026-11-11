"use server";
/** تعیین دستی حساب عمده در پنل (FR-ADM-05، D-046) */
import { revalidatePath } from "next/cache";
import { fa } from "@/content/fa";
import { db } from "@/lib/db";
import { toLatinDigits } from "@/lib/format";
import { audit, staffWith } from "@/modules/admin/server";

export type WholesaleState = {
  ok: boolean;
  message: string;
  values?: Record<string, string>;
} | null;

export async function saveWholesale(
  _prev: WholesaleState,
  form: FormData,
): Promise<WholesaleState> {
  const t = fa.admin.customers;
  const me = await staffWith("customers.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const values = Object.fromEntries(
    [...form.entries()].filter(([, v]) => typeof v === "string").map(([k, v]) => [k, String(v)]),
  );
  const user = await db.user.findFirst({
    where: { id: values.userId ?? "", role: "CUSTOMER" },
    include: { organization: true },
  });
  if (!user) return { ok: false, message: t.notFound };

  if (values.wholesale !== "on") {
    // بازگشت به خرده‌فروشی؛ اطلاعات فروشگاه/کافه برای سابقه می‌ماند
    await db.user.update({ where: { id: user.id }, data: { customerType: "B2C" } });
    if (user.organization)
      await db.organization.update({
        where: { id: user.organization.id },
        data: { status: "REJECTED" },
      });
    await audit(me.id, "customer.wholesale", "user", user.id, { wholesale: false });
    revalidatePath(`/admin/customers/${user.id}`);
    revalidatePath("/admin/customers");
    return { ok: true, message: t.saved, values };
  }

  const name = (values.orgName ?? "").trim().slice(0, 120);
  const nationalId = toLatinDigits(values.nationalId ?? "").replace(/\D/g, "") || null;
  const economicCode = toLatinDigits(values.economicCode ?? "").replace(/\D/g, "") || null;
  const priceLevel = Number(toLatinDigits(values.priceLevel ?? "1"));
  if (name.length < 2) return { ok: false, message: t.errors.orgName, values };
  if (nationalId && !/^\d{10,11}$/.test(nationalId))
    return { ok: false, message: t.errors.nationalId, values };
  if (!Number.isInteger(priceLevel) || priceLevel < 1 || priceLevel > 5)
    return { ok: false, message: t.errors.priceLevel, values };

  const data = { name, nationalId, economicCode, priceLevel, status: "APPROVED" as const };
  await db.$transaction(async (tx) => {
    const org = user.organization
      ? await tx.organization.update({ where: { id: user.organization.id }, data })
      : await tx.organization.create({ data });
    await tx.user.update({
      where: { id: user.id },
      data: { customerType: "B2B", organizationId: org.id },
    });
  });
  await audit(me.id, "customer.wholesale", "user", user.id, { wholesale: true, name, priceLevel });
  revalidatePath(`/admin/customers/${user.id}`);
  revalidatePath("/admin/customers");
  return { ok: true, message: t.saved, values };
}
