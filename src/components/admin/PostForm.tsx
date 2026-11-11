"use client";
/** نوشتن و ویرایش مقاله‌ی مجله (FR-SEO-04، D-053) */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { fa } from "@/content/fa";
import { useResyncAfterAction } from "./useResyncAfterAction";
import { POST_SECTIONS } from "@/modules/content";
import { deletePost, savePost } from "@/modules/content/blog-actions";
import { ProductPicker } from "./ProductPicker";
import { RichTextField } from "./RichTextField";
import { btnGhost, btnPrimary, card, inputCls } from "./ui";
import { FormSelect } from "@/components/FormSelect";

export type PostInitial = {
  id?: string;
  title: string;
  slug: string;
  section: string;
  excerpt: string;
  body: string;
  tags: string;
  productIds: string[];
  coverImage: string | null;
  coverAlt: string;
  publishAt: string;
  seoTitle: string;
  seoDescription: string;
  status: "DRAFT" | "PUBLISHED";
};

export function PostForm({
  initial,
  products,
}: {
  initial: PostInitial;
  products: { id: string; name: string }[];
}) {
  const t = fa.admin.content.posts;
  const router = useRouter();
  const [state, action, pending] = useActionState(savePost, null);
  useResyncAfterAction(state);
  const [removing, startRemove] = useTransition();
  const e = state?.errors ?? {};
  const v = (k: keyof PostInitial) => state?.values?.[k] ?? String(initial[k] ?? "");
  // select بعد از خطا با reset فرم به مقدار اول برمی‌گشت؛ کنترل‌شده نگه داشته می‌شود
  const [sectionValue, setSectionValue] = useState(initial.section || "guide");

  useEffect(() => {
    if (state?.ok && !initial.id && state.id) router.replace(`/admin/content/posts/${state.id}`);
  }, [state, initial.id, router]);

  const field = (k: keyof PostInitial, label: string, props: Record<string, unknown> = {}) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`post-${k}`} className="text-xs font-medium">
        {label}
      </label>
      <input
        id={`post-${k}`}
        name={k}
        defaultValue={v(k)}
        aria-invalid={!!e[k]}
        className={inputCls}
        {...props}
      />
      {e[k] && <p className="text-bad text-sm">{e[k]}</p>}
    </div>
  );
  const section = `${card} space-y-4 p-5`;

  return (
    <form action={action} className="space-y-5" key={initial.id ?? "new"}>
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/content?tab=posts" className="text-copper text-sm underline">
          {t.back}
        </Link>
        {initial.id && (
          <Link
            href={`/blog/${initial.slug}`}
            target="_blank"
            className="text-copper text-sm underline"
          >
            {initial.status === "PUBLISHED" ? t.view : t.preview}
          </Link>
        )}
      </div>

      <section className={section}>
        <h2 className="font-bold">{t.sections.content}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {field("title", t.fields.title, { required: true, maxLength: 120 })}
          {field("slug", t.fields.slug, { required: true, dir: "ltr", maxLength: 80 })}
          <div className="flex flex-col gap-1">
            <label htmlFor="post-section" className="text-xs font-medium">
              {t.fields.section}
            </label>
            <FormSelect
              id="post-section"
              name="section"
              value={sectionValue}
              onChange={(ev) => setSectionValue(ev.target.value)}
              className={inputCls}
            >
              {POST_SECTIONS.map((s) => (
                <option key={s} value={s}>
                  {fa.blog.sections[s]}
                </option>
              ))}
            </FormSelect>
          </div>
          {field("excerpt", t.fields.excerpt, { maxLength: 300 })}
        </div>
        <RichTextField
          id="post-body"
          name="body"
          label={t.fields.body}
          hint={t.fields.bodyHint}
          defaultValue={v("body")}
          error={e.body}
          rows={18}
        />
      </section>

      <section className={section}>
        <h2 className="font-bold">{t.sections.extra}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="post-cover" className="text-xs font-medium">
              {t.fields.cover}
            </label>
            {initial.coverImage && (
              // eslint-disable-next-line @next/next/no-img-element -- پیش‌نمایش ساده در پنل
              <img
                src={initial.coverImage}
                alt=""
                className="rounded-ctl aspect-[1200/630] w-full max-w-sm object-cover"
              />
            )}
            <input
              id="post-cover"
              name="cover"
              type="file"
              accept="image/jpeg,image/png,image/webp"
            />
            {state?.values?.pendingCover && (
              <>
                <input type="hidden" name="pendingCover" value={state.values.pendingCover} />
                <p className="text-ok text-xs">{t.pendingCover}</p>
              </>
            )}
            {initial.coverImage && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="removeCover" /> {t.fields.removeCover}
              </label>
            )}
            {e.cover && <p className="text-bad text-sm">{e.cover}</p>}
          </div>
          <div className="space-y-4">
            {field("coverAlt", t.fields.coverAlt, { maxLength: 150 })}
            {field("tags", t.fields.tags, { maxLength: 400 })}
          </div>
        </div>
        <ProductPicker options={products} initial={initial.productIds} label={t.fields.products} />
      </section>

      <section className={section}>
        <h2 className="font-bold">{t.sections.seo}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {field("publishAt", t.fields.publishAt, { placeholder: "۱۴۰۵/۰۹/۰۱", dir: "ltr" })}
          {field("seoTitle", t.fields.seoTitle, { maxLength: 70 })}
        </div>
        {field("seoDescription", t.fields.seoDescription, { maxLength: 170 })}
      </section>

      <div className="bg-bg/95 border-line sticky bottom-0 flex flex-wrap items-center gap-3 border-t py-3">
        <button type="submit" name="intent" value="save" disabled={pending} className={btnGhost}>
          {t.save}
        </button>
        {initial.status === "PUBLISHED" ? (
          <button
            type="submit"
            name="intent"
            value="unpublish"
            disabled={pending}
            className={btnGhost}
          >
            {t.unpublish}
          </button>
        ) : (
          <button
            type="submit"
            name="intent"
            value="publish"
            disabled={pending}
            className={btnPrimary}
          >
            {t.publish}
          </button>
        )}
        <span role="status" className={`text-sm ${state?.ok ? "text-ok" : "text-bad"}`}>
          {state?.message ?? ""}
        </span>
        {initial.id && (
          <button
            type="button"
            disabled={removing}
            className="text-bad ms-auto text-sm underline"
            onClick={() => {
              if (!window.confirm(t.confirmRemove)) return;
              startRemove(async () => {
                const r = await deletePost(initial.id!);
                if (r.ok) router.replace("/admin/content?tab=posts");
              });
            }}
          >
            {t.remove}
          </button>
        )}
      </div>
    </form>
  );
}
