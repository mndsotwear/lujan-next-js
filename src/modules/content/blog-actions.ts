"use server";
/** مقاله‌ی بلاگ و صفحه‌ی فرود از پنل (FR-SEO-04، FR-SEO-05، D-053) — مجوز content.manage */
import { revalidatePath } from "next/cache";
import { fa } from "@/content/fa";
import { db } from "@/lib/db";
import { parseJalali } from "@/lib/jalali";
import { audit, staffWith } from "@/modules/admin/server";
import { normalizeCode } from "@/modules/cart";
import { normalizeSlug, validSlug } from "@/modules/catalog";
import { isSafeImageName, sniffImage } from "@/modules/returns";
import { isPostSection, parseIds, parseTags } from "./blog-rules";
import { readContentImage, removeContentImage, saveContentImage } from "./media";

export type EditorState = {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
  id?: string;
} | null;

const MAX_IMAGE = 8 * 1024 * 1024;
const str = (form: FormData, k: string, max: number) =>
  String(form.get(k) ?? "")
    .trim()
    .slice(0, max);

/** تصویر تازه؛ یا تصویری که در ارسال قبلی (با خطای دیگر) بارگذاری شده و هنوز استفاده نشده */
async function readCover(form: FormData): Promise<{ url?: string; error?: string }> {
  const f = form.get("cover");
  if (!f || typeof f !== "object" || !("arrayBuffer" in f) || f.size === 0) {
    const pending = String(form.get("pendingCover") ?? "");
    const name = pending.startsWith("/media/content/") ? pending.slice(15) : "";
    return isSafeImageName(name) && (await readContentImage(name)) ? { url: pending } : {};
  }
  if (f.size > MAX_IMAGE) return { error: fa.admin.catalog.errors.imageSize };
  const bytes = new Uint8Array(await f.arrayBuffer());
  const ext = sniffImage(bytes.subarray(0, 16));
  if (!ext) return { error: fa.admin.catalog.errors.imageType };
  return { url: await saveContentImage(bytes, ext) };
}

const textValues = (form: FormData) =>
  Object.fromEntries(
    [...form.entries()]
      .filter(([k, v]) => typeof v === "string" && k !== "productIds")
      .map(([k, v]) => [k, String(v)]),
  );

function refreshBlog(slug?: string) {
  revalidatePath("/blog");
  if (slug) revalidatePath(`/blog/${slug}`);
  revalidatePath("/admin/content", "layout");
}

export async function savePost(_prev: EditorState, form: FormData): Promise<EditorState> {
  const t = fa.admin.content.posts;
  const me = await staffWith("content.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const values = textValues(form);
  const id = values.id || null;
  const old = id ? await db.post.findUnique({ where: { id } }) : null;
  if (id && !old) return { ok: false, message: t.errors.notFound };

  const intent =
    values.intent === "publish" ? "publish" : values.intent === "unpublish" ? "unpublish" : "save";
  const title = str(form, "title", 120);
  const slug = normalizeSlug(str(form, "slug", 80));
  const section = str(form, "section", 20);
  const body = str(form, "body", 50_000);
  const excerpt = str(form, "excerpt", 300) || null;
  const coverAlt = str(form, "coverAlt", 150) || null;
  const publishAtRaw = str(form, "publishAt", 20);
  const publishAt = publishAtRaw ? parseJalali(publishAtRaw) : null;

  const errors: Record<string, string> = {};
  if (title.length < 3) errors.title = t.errors.title;
  if (!validSlug(slug)) errors.slug = t.errors.slug;
  if (!isPostSection(section)) errors.section = t.errors.section;
  if (publishAtRaw && !publishAt) errors.publishAt = fa.admin.marketing.coupons.errors.dateFormat;
  const willPublish = intent === "publish" || (intent === "save" && old?.status === "PUBLISHED");
  if (willPublish && body.length < 100) errors.body = t.errors.body;
  if (!errors.slug) {
    const clash = await db.post.findUnique({ where: { slug }, select: { id: true } });
    if (clash && clash.id !== old?.id) errors.slug = t.errors.slugTaken;
  }
  const cover = await readCover(form);
  if (cover.error) errors.cover = cover.error;
  const hasCover = !!cover.url || (!!old?.coverImage && values.removeCover !== "on");
  if (hasCover && !coverAlt) errors.coverAlt = t.errors.coverAlt;
  if (Object.keys(errors).length) {
    // تصویر بارگذاری‌شده نگه داشته می‌شود تا بعد از اصلاح خطا دوباره انتخاب لازم نباشد
    return {
      ok: false,
      message: t.errors.fix,
      errors,
      values: { ...values, pendingCover: cover.url ?? "" },
    };
  }

  const status =
    intent === "publish"
      ? "PUBLISHED"
      : intent === "unpublish"
        ? "DRAFT"
        : (old?.status ?? "DRAFT");
  const publishedAt =
    status === "PUBLISHED" ? (publishAt ?? old?.publishedAt ?? new Date()) : (publishAt ?? null);
  const coverImage = cover.url ?? (values.removeCover === "on" ? null : (old?.coverImage ?? null));
  const data = {
    title,
    slug,
    section,
    body,
    excerpt,
    tags: parseTags(str(form, "tags", 400)),
    productIds: parseIds(form.getAll("productIds").map(String)),
    coverImage,
    coverAlt: coverImage ? coverAlt : null,
    status,
    publishedAt,
    seoTitle: str(form, "seoTitle", 70) || null,
    seoDescription: str(form, "seoDescription", 170) || null,
  } as const;
  const post = old
    ? await db.post.update({ where: { id: old.id }, data })
    : await db.post.create({ data });
  if (old?.coverImage && old.coverImage !== coverImage) await removeContentImage(old.coverImage);
  await audit(
    me.id,
    intent === "publish"
      ? "post.publish"
      : intent === "unpublish"
        ? "post.unpublish"
        : old
          ? "post.update"
          : "post.create",
    "post",
    post.id,
    { title, slug, status },
  );
  refreshBlog(post.slug);
  if (old && old.slug !== post.slug) refreshBlog(old.slug);
  return {
    ok: true,
    message: status === "PUBLISHED" ? t.published : t.saved,
    id: post.id,
  };
}

export async function deletePost(id: string): Promise<{ ok: boolean; message: string }> {
  const me = await staffWith("content.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const p = await db.post.findUnique({ where: { id } });
  if (!p) return { ok: false, message: fa.admin.content.posts.errors.notFound };
  await db.post.delete({ where: { id } });
  await removeContentImage(p.coverImage);
  await audit(me.id, "post.delete", "post", id, { title: p.title, slug: p.slug });
  refreshBlog(p.slug);
  return { ok: true, message: fa.admin.content.posts.deleted };
}

export async function saveLanding(_prev: EditorState, form: FormData): Promise<EditorState> {
  const t = fa.admin.content.landings;
  const me = await staffWith("content.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const values = textValues(form);
  const id = values.id || null;
  const old = id ? await db.landing.findUnique({ where: { id } }) : null;
  if (id && !old) return { ok: false, message: t.errors.notFound };

  const title = str(form, "title", 120);
  const slug = normalizeSlug(str(form, "slug", 80));
  const productIds = parseIds(form.getAll("productIds").map(String), 24);
  const couponRaw = str(form, "couponCode", 40);
  const couponCode = couponRaw ? normalizeCode(couponRaw) : null;
  const coverAlt = str(form, "coverAlt", 150) || null;
  const startsRaw = str(form, "startsAt", 20);
  const endsRaw = str(form, "endsAt", 20);
  const startsAt = startsRaw ? parseJalali(startsRaw) : null;
  const endsAt = endsRaw ? parseJalali(endsRaw, true) : null;
  const isActive = values.isActive === "on";

  const errors: Record<string, string> = {};
  if (title.length < 3) errors.title = t.errors.title;
  if (!validSlug(slug)) errors.slug = t.errors.slug;
  if ((startsRaw && !startsAt) || (endsRaw && !endsAt))
    errors.dates = fa.admin.marketing.coupons.errors.dateFormat;
  else if (startsAt && endsAt && endsAt < startsAt) errors.dates = t.errors.dates;
  if (isActive && productIds.length === 0) errors.products = t.errors.products;
  if (
    couponCode &&
    !(await db.coupon.findUnique({ where: { code: couponCode }, select: { id: true } }))
  )
    errors.couponCode = t.errors.coupon;
  if (!errors.slug) {
    const clash = await db.landing.findUnique({ where: { slug }, select: { id: true } });
    if (clash && clash.id !== old?.id) errors.slug = t.errors.slugTaken;
  }
  const cover = await readCover(form);
  if (cover.error) errors.cover = cover.error;
  const hasCover = !!cover.url || (!!old?.coverImage && values.removeCover !== "on");
  if (hasCover && !coverAlt) errors.coverAlt = fa.admin.content.posts.errors.coverAlt;
  if (Object.keys(errors).length) {
    return {
      ok: false,
      message: fa.admin.content.posts.errors.fix,
      errors,
      values: { ...values, pendingCover: cover.url ?? "" },
    };
  }
  const coverImage = cover.url ?? (values.removeCover === "on" ? null : (old?.coverImage ?? null));
  const data = {
    title,
    slug,
    intro: str(form, "intro", 5_000) || null,
    productIds,
    couponCode,
    coverImage,
    coverAlt: coverImage ? coverAlt : null,
    isActive,
    startsAt,
    endsAt,
    seoDescription: str(form, "seoDescription", 170) || null,
  };
  const l = old
    ? await db.landing.update({ where: { id: old.id }, data })
    : await db.landing.create({ data });
  if (old?.coverImage && old.coverImage !== coverImage) await removeContentImage(old.coverImage);
  await audit(me.id, old ? "landing.update" : "landing.create", "landing", l.id, {
    title,
    slug,
    isActive,
  });
  revalidatePath(`/offers/${l.slug}`);
  revalidatePath("/admin/content", "layout");
  return { ok: true, message: t.saved, id: l.id };
}

export async function deleteLanding(id: string): Promise<{ ok: boolean; message: string }> {
  const me = await staffWith("content.manage");
  if (!me) return { ok: false, message: fa.admin.forbidden };
  const l = await db.landing.findUnique({ where: { id } });
  if (!l) return { ok: false, message: fa.admin.content.landings.errors.notFound };
  await db.landing.delete({ where: { id } });
  await removeContentImage(l.coverImage);
  await audit(me.id, "landing.delete", "landing", id, { title: l.title, slug: l.slug });
  revalidatePath("/admin/content", "layout");
  return { ok: true, message: fa.admin.content.landings.deleted };
}
