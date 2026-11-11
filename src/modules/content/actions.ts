"use server";
/** بنر صفحه‌ی اصلی و صفحه‌های ثابت (FR-ADM-09 محدود به D-036، D-048) */
import { revalidatePath } from "next/cache";
import { fa } from "@/content/fa";
import { db } from "@/lib/db";
import { toLatinDigits } from "@/lib/format";
import { parseJalali } from "@/lib/jalali";
import { audit, staffWith } from "@/modules/admin/server";
import { sniffImage } from "@/modules/returns";
import { removeBannerImage, saveBannerImage } from "./media";
import { PAGE_SLUGS, safeLink, type PageSlug } from "./rules";

export type ContentState = { ok: boolean; message: string; values?: Record<string, string> } | null;
const MAX = 8 * 1024 * 1024;

async function readImage(form: FormData, key: string): Promise<{ url?: string; error?: string }> {
  const f = form.get(key);
  if (!f || typeof f !== "object" || !("arrayBuffer" in f) || f.size === 0) return {};
  if (f.size > MAX) return { error: fa.admin.catalog.errors.imageSize };
  const bytes = new Uint8Array(await f.arrayBuffer());
  const ext = sniffImage(bytes.subarray(0, 16));
  if (!ext) return { error: fa.admin.catalog.errors.imageType };
  return { url: await saveBannerImage(bytes, ext) };
}

export async function saveBanner(_prev: ContentState, form: FormData): Promise<ContentState> {
  const t = fa.admin.content.banners;
  const me = await staffWith("content.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const values = Object.fromEntries(
    [...form.entries()].filter(([, v]) => typeof v === "string").map(([k, v]) => [k, String(v)]),
  );
  const id = values.id || null;
  const old = id ? await db.banner.findUnique({ where: { id } }) : null;
  if (id && !old) return { ok: false, message: t.errors.notFound, values };
  const title = (values.title ?? "").trim().slice(0, 80);
  const alt = (values.alt ?? "").trim().slice(0, 150);
  const linkRaw = (values.link ?? "").trim();
  const link = linkRaw ? safeLink(linkRaw) : null;
  const startsAt = values.startsAt?.trim() ? parseJalali(values.startsAt) : null;
  const endsAt = values.endsAt?.trim() ? parseJalali(values.endsAt, true) : null;
  if (title.length < 2) return { ok: false, message: t.errors.title, values };
  if (!alt) return { ok: false, message: t.errors.alt, values };
  if (linkRaw && !link) return { ok: false, message: t.errors.link, values };
  if ((values.startsAt?.trim() && !startsAt) || (values.endsAt?.trim() && !endsAt))
    return { ok: false, message: fa.admin.marketing.coupons.errors.dateFormat, values };
  const desk = await readImage(form, "imageDesktop");
  const mob = await readImage(form, "imageMobile");
  if (desk.error || mob.error) return { ok: false, message: (desk.error ?? mob.error)!, values };
  if (!old && !desk.url) return { ok: false, message: t.errors.image, values };
  const data = {
    title,
    subtitle: (values.subtitle ?? "").trim().slice(0, 160) || null,
    link,
    alt,
    startsAt,
    endsAt,
    isActive: values.isActive === "on",
    sortOrder: Number(toLatinDigits(values.sortOrder ?? "")) || 0,
    ...(desk.url ? { imageDesktop: desk.url } : {}),
    ...(mob.url ? { imageMobile: mob.url } : {}),
  };
  const b = old
    ? await db.banner.update({ where: { id: old.id }, data })
    : await db.banner.create({ data: { ...data, imageDesktop: desk.url! } });
  if (old && desk.url) await removeBannerImage(old.imageDesktop);
  if (old && mob.url) await removeBannerImage(old.imageMobile);
  await audit(me.id, old ? "banner.update" : "banner.create", "banner", b.id, {
    title,
    isActive: b.isActive,
  });
  revalidatePath("/");
  revalidatePath("/admin/content");
  return { ok: true, message: t.saved, values: old ? values : undefined };
}

export async function deleteBanner(id: string): Promise<{ ok: boolean; message: string }> {
  const me = await staffWith("content.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const b = await db.banner.findUnique({ where: { id } });
  if (!b) return { ok: false, message: fa.admin.content.banners.errors.notFound };
  await db.banner.delete({ where: { id } });
  await removeBannerImage(b.imageDesktop);
  await removeBannerImage(b.imageMobile);
  await audit(me.id, "banner.delete", "banner", id, { title: b.title });
  revalidatePath("/");
  revalidatePath("/admin/content");
  return { ok: true, message: fa.admin.content.banners.saved };
}

export async function savePage(_prev: ContentState, form: FormData): Promise<ContentState> {
  const t = fa.admin.content.pages;
  const me = await staffWith("content.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const slug = String(form.get("slug") ?? "") as PageSlug;
  const title = String(form.get("title") ?? "")
    .trim()
    .slice(0, 80);
  const body = String(form.get("body") ?? "")
    .trim()
    .slice(0, 20_000);
  const values = { slug, title, body };
  if (!PAGE_SLUGS.includes(slug)) return { ok: false, message: t.errors.slug, values };
  if (title.length < 2 || body.length < 10) return { ok: false, message: t.errors.empty, values };
  await db.page.upsert({ where: { slug }, update: { title, body }, create: { slug, title, body } });
  await audit(me.id, "page.update", "page", slug, { title });
  revalidatePath(`/${slug}`);
  revalidatePath("/admin/content");
  return { ok: true, message: t.saved, values };
}
