"use client";
/** اطلاعات اصلی، معرفی، مشخصات و سئوی محصول (FR-ADM-01، D-044) */
import { FLAVORS } from "@/modules/catalog/flavors";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { fa } from "@/content/fa";
import { useResyncAfterAction } from "./useResyncAfterAction";
import type { SpecField } from "@/modules/catalog";
import { saveProduct } from "@/modules/catalog/admin-actions";
import { RichText } from "../RichText";
import { btnGhost, btnPrimary, card, inputCls } from "./ui";
import { FormSelect } from "@/components/FormSelect";

type Cat = { id: string; name: string; specSchema: SpecField[] };
export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  categoryId: string;
  brandId: string;
  summary: string;
  description: string;
  warrantyMonths: string;
  warrantyNote: string;
  tags: string;
  /** طعم‌ها برای طعم‌یاب */
  flavors?: string[];
  status: string;
  seoTitle: string;
  seoDescription: string;
  specs: Record<string, string | number | boolean>;
};

const t = fa.admin.catalog;

function Input({
  name,
  label,
  value,
  error,
  hint,
  dir,
  inputMode,
}: {
  name: string;
  label: string;
  value: string;
  error?: string;
  hint?: string;
  dir?: "ltr";
  inputMode?: "numeric";
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`p-${name}`} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={`p-${name}`}
        name={name}
        defaultValue={value}
        dir={dir}
        inputMode={inputMode}
        aria-invalid={!!error}
        aria-describedby={error || hint ? `p-${name}-d` : undefined}
        className={`${inputCls} ${error ? "border-bad" : ""}`}
      />
      {(error || hint) && (
        <small id={`p-${name}-d`} className={`text-xs ${error ? "text-bad" : "text-steel"}`}>
          {error ?? hint}
        </small>
      )}
    </div>
  );
}

export function ProductForm({
  initial,
  categories,
  brands,
}: {
  initial: ProductFormValues;
  categories: Cat[];
  brands: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveProduct, null);
  useResyncAfterAction(state);
  const v = state?.values;
  const val = (k: keyof ProductFormValues) => v?.[k] ?? String(initial[k] ?? "");
  const e = state?.errors ?? {};
  const [catId, setCatId] = useState(initial.categoryId || categories[0]?.id || "");
  const [desc, setDesc] = useState(initial.description);
  const [preview, setPreview] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const schema = categories.find((c) => c.id === catId)?.specSchema ?? [];

  useEffect(() => {
    if (state?.ok && !initial.id && state.id) router.push(`/admin/products/${state.id}`);
  }, [state, initial.id, router]);

  /** دکمه‌های قالب: نشانه را دور متن انتخاب‌شده یا اول خط می‌گذارد */
  const wrap = (kind: "bold" | "list" | "heading") => {
    const el = area.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b, value } = el;
    const sel = value.slice(a, b) || (kind === "bold" ? "متن" : "");
    const lineStart = value.lastIndexOf("\n", a - 1) + 1;
    const next =
      kind === "bold"
        ? value.slice(0, a) + `**${sel}**` + value.slice(b)
        : value.slice(0, lineStart) + (kind === "list" ? "- " : "## ") + value.slice(lineStart);
    setDesc(next);
    requestAnimationFrame(() => el.focus());
  };

  const specValue = (key: string) => {
    if (v && `spec_${key}` in v) return v[`spec_${key}`] ?? "";
    const raw = initial.specs[key];
    if (raw === true) return "yes";
    if (raw === false) return "no";
    return raw === undefined ? "" : String(raw);
  };

  const section = `${card} space-y-4 p-5`;
  return (
    <form action={action} className="space-y-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <section className={section}>
        <h2 className="font-bold">{t.sections.basic}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Input name="name" label={t.fields.name} value={val("name")} error={e.name} />
          <Input
            name="slug"
            label={t.fields.slug}
            value={val("slug")}
            error={e.slug}
            hint={t.fields.slugHint}
            dir="ltr"
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="p-categoryId" className="text-sm font-medium">
              {t.fields.category}
            </label>
            <FormSelect
              id="p-categoryId"
              name="categoryId"
              value={catId}
              onChange={(ev) => setCatId(ev.target.value)}
              className={inputCls}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </FormSelect>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="p-brandId" className="text-sm font-medium">
              {t.fields.brand}
            </label>
            <FormSelect
              id="p-brandId"
              name="brandId"
              defaultValue={val("brandId") || brands[0]?.id}
              className={inputCls}
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </FormSelect>
          </div>
        </div>
        <Input name="summary" label={t.fields.summary} value={val("summary")} />
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            name="warrantyMonths"
            label={t.fields.warrantyMonths}
            value={val("warrantyMonths")}
            error={e.warrantyMonths}
            inputMode="numeric"
          />
          <Input name="warrantyNote" label={t.fields.warrantyNote} value={val("warrantyNote")} />
          <Input name="tags" label={t.fields.tags} value={val("tags")} />
        </div>
        <fieldset className="space-y-2">
          <input type="hidden" name="flavorsField" value="1" />
          <legend className="text-sm font-medium">{t.fields.flavors}</legend>
          <div className="flex flex-wrap gap-2">
            {FLAVORS.map((f) => (
              <label
                key={f.slug}
                className="border-line has-[:checked]:border-copper has-[:checked]:bg-copper-soft flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm"
              >
                <input
                  type="checkbox"
                  name="flavors"
                  value={f.slug}
                  defaultChecked={initial.flavors?.includes(f.slug)}
                  className="accent-copper size-4"
                />
                {f.emoji} {f.label}
              </label>
            ))}
          </div>
          <small className="text-steel block text-xs">{t.flavorsHint}</small>
        </fieldset>
        <div className="flex flex-col gap-1">
          <label htmlFor="p-status" className="text-sm font-medium">
            {t.fields.status}
          </label>
          <FormSelect
            id="p-status"
            name="status"
            defaultValue={val("status") || "DRAFT"}
            className={`${inputCls} md:w-60`}
          >
            {Object.entries(t.status).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </FormSelect>
          {e.status && <small className="text-bad text-xs">{e.status}</small>}
        </div>
      </section>

      <section className={section}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">{t.sections.description}</h2>
          <div className="flex gap-2">
            {(["bold", "list", "heading"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => wrap(k)}
                className={btnGhost}
                disabled={preview}
              >
                {t.format[k]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPreview((p) => !p)}
              className={btnGhost}
              aria-pressed={preview}
            >
              {t.preview}
            </button>
          </div>
        </div>
        <textarea
          ref={area}
          name="description"
          value={desc}
          onChange={(ev) => setDesc(ev.target.value)}
          rows={10}
          aria-label={t.fields.description}
          aria-describedby="p-desc-hint"
          className={`${inputCls} py-2 leading-7 ${preview ? "hidden" : ""}`}
        />
        {preview && <RichText text={desc} className="rounded-ctl bg-surface-2/50 p-4" />}
        <small id="p-desc-hint" className="text-steel text-xs">
          {t.fields.descriptionHint}
        </small>
      </section>

      <section className={section}>
        <h2 className="font-bold">{t.sections.specs}</h2>
        <p className="text-steel text-xs">{t.specsFromCategory}</p>
        {e.specs && <p className="text-bad text-sm">{e.specs}</p>}
        <div className="grid gap-4 md:grid-cols-2">
          {schema.map((f) => (
            <div key={`${catId}-${f.key}`} className="flex flex-col gap-1">
              <label htmlFor={`spec-${f.key}`} className="text-sm font-medium">
                {f.label}
                {f.type === "number" ? ` (${f.unit})` : ""}
                {f.required ? " *" : ""}
              </label>
              {f.type === "enum" || f.type === "boolean" ? (
                <FormSelect
                  id={`spec-${f.key}`}
                  name={`spec_${f.key}`}
                  defaultValue={specValue(f.key)}
                  className={inputCls}
                >
                  <option value="">{t.fields.unset}</option>
                  {f.type === "enum"
                    ? f.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))
                    : [
                        <option key="yes" value="yes">
                          {t.fields.yes}
                        </option>,
                        <option key="no" value="no">
                          {t.fields.no}
                        </option>,
                      ]}
                </FormSelect>
              ) : (
                <input
                  id={`spec-${f.key}`}
                  name={`spec_${f.key}`}
                  defaultValue={specValue(f.key)}
                  inputMode={f.type === "number" ? "decimal" : undefined}
                  className={inputCls}
                />
              )}
            </div>
          ))}
        </div>
      </section>

      <section className={section}>
        <h2 className="font-bold">{t.sections.seo}</h2>
        <Input name="seoTitle" label={t.fields.seoTitle} value={val("seoTitle")} />
        <Input
          name="seoDescription"
          label={t.fields.seoDescription}
          value={val("seoDescription")}
        />
      </section>

      <div className="bg-bg/90 sticky bottom-0 flex items-center gap-4 py-3 backdrop-blur">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? t.saving : t.save}
        </button>
        <p role="status" className={`text-sm ${state?.ok ? "text-ok" : "text-bad"}`}>
          {state?.message ?? ""}
        </p>
      </div>
    </form>
  );
}
