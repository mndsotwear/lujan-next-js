"use client";
/** صفحه‌ی فرود کمپین (FR-SEO-05) */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useTransition } from "react";
import { fa } from "@/content/fa";
import { deleteLanding, saveLanding } from "@/modules/content/blog-actions";
import { ProductPicker } from "./ProductPicker";
import { RichTextField } from "./RichTextField";
import { btnPrimary, card, inputCls } from "./ui";

export type LandingInitial = {
  id?: string;
  title: string;
  slug: string;
  intro: string;
  productIds: string[];
  couponCode: string;
  coverImage: string | null;
  coverAlt: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  seoDescription: string;
};

export function LandingForm({
  initial,
  products,
}: {
  initial: LandingInitial;
  products: { id: string; name: string }[];
}) {
  const t = fa.admin.content.landings;
  const router = useRouter();
  const [state, action, pending] = useActionState(saveLanding, null);
  const [removing, startRemove] = useTransition();
  const e = state?.errors ?? {};
  const v = (k: keyof LandingInitial) => state?.values?.[k] ?? String(initial[k] ?? "");

  useEffect(() => {
    if (state?.ok && !initial.id && state.id) router.replace(`/admin/content/landings/${state.id}`);
  }, [state, initial.id, router]);

  const field = (k: keyof LandingInitial, label: string, props: Record<string, unknown> = {}) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`ld-${k}`} className="text-xs font-medium">
        {label}
      </label>
      <input
        id={`ld-${k}`}
        name={k}
        defaultValue={v(k)}
        aria-invalid={!!e[k]}
        className={inputCls}
        {...props}
      />
      {e[k] && <p className="text-bad text-sm">{e[k]}</p>}
    </div>
  );

  return (
    <form action={action} className={`${card} space-y-5 p-5`} key={initial.id ?? "new"}>
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/content?tab=landings" className="text-copper text-sm underline">
          {t.back}
        </Link>
        {initial.id && (
          <Link
            href={`/offers/${initial.slug}`}
            target="_blank"
            className="text-copper text-sm underline"
          >
            {t.view}
          </Link>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {field("title", t.fields.title, { required: true, maxLength: 120 })}
        {field("slug", t.fields.slug, { required: true, dir: "ltr", maxLength: 80 })}
        {field("couponCode", t.fields.couponCode, { dir: "ltr", maxLength: 40 })}
        {field("seoDescription", t.fields.seoDescription, { maxLength: 170 })}
        {field("startsAt", t.fields.startsAt, { placeholder: "۱۴۰۵/۰۹/۳۰", dir: "ltr" })}
        {field("endsAt", t.fields.endsAt, { placeholder: "۱۴۰۵/۱۰/۰۱", dir: "ltr" })}
      </div>
      {e.dates && <p className="text-bad text-sm">{e.dates}</p>}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={state?.values ? state.values.isActive === "on" : initial.isActive}
        />
        {t.fields.isActive}
      </label>
      <RichTextField
        id="ld-intro"
        name="intro"
        label={t.fields.intro}
        defaultValue={v("intro")}
        rows={6}
      />
      <ProductPicker
        options={products}
        initial={initial.productIds}
        label={t.fields.products}
        max={24}
        error={e.products}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="ld-cover" className="text-xs font-medium">
            {t.fields.cover}
          </label>
          {initial.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element -- پیش‌نمایش ساده در پنل
            <img
              src={initial.coverImage}
              alt=""
              className="rounded-ctl w-full max-w-sm object-cover"
            />
          )}
          <input id="ld-cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp" />
          {state?.values?.pendingCover && (
            <>
              <input type="hidden" name="pendingCover" value={state.values.pendingCover} />
              <p className="text-ok text-xs">{fa.admin.content.posts.pendingCover}</p>
            </>
          )}
          {initial.coverImage && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="removeCover" /> {t.fields.removeCover}
            </label>
          )}
          {e.cover && <p className="text-bad text-sm">{e.cover}</p>}
        </div>
        {field("coverAlt", t.fields.coverAlt, { maxLength: 150 })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {t.save}
        </button>
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
                const r = await deleteLanding(initial.id!);
                if (r.ok) router.replace("/admin/content?tab=landings");
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
