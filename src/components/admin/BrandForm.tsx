"use client";
import { useActionState } from "react";
import { fa } from "@/content/fa";
import { saveBrand } from "@/modules/catalog/admin-actions";
import { btnGhost, inputCls } from "./ui";

/** افزودن یا ویرایش برند (FR-ADM-03) */
export function BrandForm({ brand }: { brand?: { id: string; name: string; slug: string } }) {
  const [state, action, pending] = useActionState(saveBrand, null);
  const tb = fa.admin.catalog.brand;
  const e = state?.errors ?? {};
  const id = brand?.id ?? "new";
  return (
    <form action={action} className="grid items-start gap-2 sm:grid-cols-[1fr_1fr_auto]">
      {brand && <input type="hidden" name="id" value={brand.id} />}
      <div>
        <label className="sr-only" htmlFor={`b-name-${id}`}>
          {tb.name}
        </label>
        <input
          id={`b-name-${id}`}
          name="name"
          placeholder={tb.name}
          defaultValue={state?.values?.name ?? brand?.name}
          className={`${inputCls} min-h-10 text-sm`}
        />
        {e.name && <small className="text-bad text-xs">{e.name}</small>}
      </div>
      <div>
        <label className="sr-only" htmlFor={`b-slug-${id}`}>
          {tb.slug}
        </label>
        <input
          id={`b-slug-${id}`}
          name="slug"
          dir="ltr"
          placeholder={tb.slug}
          defaultValue={state?.values?.slug ?? brand?.slug}
          className={`${inputCls} min-h-10 text-sm`}
        />
        {e.slug && <small className="text-bad text-xs">{e.slug}</small>}
      </div>
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className={btnGhost}>
          {brand ? fa.admin.catalog.save : tb.new}
        </button>
        {state?.ok && <small className="text-ok">{state.message}</small>}
      </div>
    </form>
  );
}
