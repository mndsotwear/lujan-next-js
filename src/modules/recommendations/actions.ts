"use server";
/** قوانین پیشنهاد سبد در پنل (FR-REC-09، FR-ADM-06) */
import { revalidatePath } from "next/cache";
import { expireCatalog } from "@/lib/cache";
import { fa } from "@/content/fa";
import { db } from "@/lib/db";
import { audit, staffWith } from "@/modules/admin/server";

export type RuleResult = { ok: boolean; message: string };
const TYPES = ["COMPLEMENT", "ALTERNATIVE", "EXCLUDE"] as const;

export async function saveRule(input: {
  sourceProductId: string;
  targetProductId: string;
  type: string;
  reasonLabel: string;
  priority: number;
}): Promise<RuleResult> {
  const t = fa.admin.marketing.rules;
  const me = await staffWith("marketing.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  if (!TYPES.includes(input.type as (typeof TYPES)[number]))
    return { ok: false, message: t.errors.type };
  if (input.sourceProductId === input.targetProductId) return { ok: false, message: t.errors.same };
  const found = await db.product.count({
    where: { id: { in: [input.sourceProductId, input.targetProductId] } },
  });
  if (found !== 2) return { ok: false, message: t.errors.product };
  const type = input.type as (typeof TYPES)[number];
  const data = {
    reasonLabel: input.reasonLabel.trim().slice(0, 60) || null,
    priority: Number.isInteger(input.priority) ? Math.max(0, Math.min(100, input.priority)) : 0,
    isActive: true,
  };
  const r = await db.recommendationRule.upsert({
    where: {
      sourceProductId_targetProductId_type: {
        sourceProductId: input.sourceProductId,
        targetProductId: input.targetProductId,
        type,
      },
    },
    update: data,
    create: {
      sourceProductId: input.sourceProductId,
      targetProductId: input.targetProductId,
      type,
      ...data,
    },
  });
  await audit(me.id, "rule.save", "rule", r.id, { type, reason: data.reasonLabel });
  expireCatalog();
  revalidatePath("/admin/marketing");
  return { ok: true, message: t.saved };
}

export async function setRuleActive(id: string, isActive: boolean): Promise<RuleResult> {
  const me = await staffWith("marketing.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  await db.recommendationRule.update({ where: { id }, data: { isActive } });
  await audit(me.id, "rule.save", "rule", id, { isActive });
  expireCatalog();
  revalidatePath("/admin/marketing");
  return { ok: true, message: fa.admin.marketing.rules.saved };
}

export async function deleteRule(id: string): Promise<RuleResult> {
  const me = await staffWith("marketing.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  await db.recommendationRule.delete({ where: { id } });
  await audit(me.id, "rule.delete", "rule", id);
  expireCatalog();
  revalidatePath("/admin/marketing");
  return { ok: true, message: fa.admin.marketing.rules.saved };
}
