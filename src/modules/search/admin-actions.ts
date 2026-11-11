"use server";
/** گروه‌های مترادف جستجو (FR-SRCH-03، FR-ADM-06) */
import { revalidatePath } from "next/cache";
import { fa } from "@/content/fa";
import { db } from "@/lib/db";
import { audit, staffWith } from "@/modules/admin/server";
import { resetSearchCache } from "./engine";
import { normalize } from "./normalize";

export type SynResult = { ok: boolean; message: string };

/** «تریمر، خط‌زن، خط زن» ← گروه بدون تکرار (حداقل ۲ واژه) */
export async function saveSynonyms(
  id: string | null,
  text: string,
  active = true,
): Promise<SynResult> {
  const t = fa.admin.marketing.synonyms;
  const me = await staffWith("marketing.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const terms = [
    ...new Set(
      text
        .split(/[،,\n]/)
        .map((w) => normalize(w))
        .filter((w) => w.length >= 2 && w.length <= 40),
    ),
  ].slice(0, 12);
  if (terms.length < 2) return { ok: false, message: t.errors.terms };
  const row = id
    ? await db.searchSynonym.update({ where: { id }, data: { terms, isActive: active } })
    : await db.searchSynonym.create({ data: { terms, isActive: active } });
  await audit(me.id, id ? "synonym.update" : "synonym.create", "synonym", row.id, {
    terms,
    active,
  });
  resetSearchCache();
  revalidatePath("/admin/marketing");
  return { ok: true, message: t.saved };
}

export async function deleteSynonyms(id: string): Promise<SynResult> {
  const me = await staffWith("marketing.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  await db.searchSynonym.delete({ where: { id } });
  await audit(me.id, "synonym.delete", "synonym", id);
  resetSearchCache();
  revalidatePath("/admin/marketing");
  return { ok: true, message: fa.admin.marketing.synonyms.saved };
}
