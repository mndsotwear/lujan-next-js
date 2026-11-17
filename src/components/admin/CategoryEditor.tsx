"use client";
/** ویرایش دسته و شِمای مشخصات/فیلترها (FR-ADM-03) */
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { fa } from "@/content/fa";
import { useResyncAfterAction } from "./useResyncAfterAction";
import type { SpecField } from "@/modules/catalog";
import { saveCategory } from "@/modules/catalog/admin-actions";
import { btnGhost, btnPrimary, card, inputCls } from "./ui";
import { FormSelect } from "@/components/FormSelect";

const t = fa.admin.catalog;
const tc = t.category;
export const CATEGORY_ICONS = ["coffee", "syrup", "snack", "noodle", "olive", "tea"];

/** ردیف قابل‌ویرایش: گزینه‌ها به‌صورت متن «value: عنوان» */
type Row = {
  key: string;
  label: string;
  type: SpecField["type"];
  unit: string;
  options: string;
  filterable: boolean;
  required: boolean;
};

const toRow = (f: SpecField): Row => ({
  key: f.key,
  label: f.label,
  type: f.type,
  unit: f.type === "number" ? f.unit : "",
  options: f.type === "enum" ? f.options.map((o) => `${o.value}: ${o.label}`).join("\n") : "",
  filterable: f.filterable,
  required: !!f.required,
});

function toField(r: Row): SpecField {
  const base = { key: r.key.trim(), label: r.label.trim(), required: r.required || undefined };
  switch (r.type) {
    case "enum":
      return {
        ...base,
        type: "enum",
        filterable: r.filterable,
        options: r.options
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => {
            const i = l.indexOf(":");
            return i > 0
              ? { value: l.slice(0, i).trim(), label: l.slice(i + 1).trim() }
              : { value: l, label: l };
          }),
      };
    case "number":
      return { ...base, type: "number", unit: r.unit.trim(), filterable: r.filterable };
    case "boolean":
      return { ...base, type: "boolean", filterable: r.filterable };
    default:
      return { ...base, type: "text", filterable: false };
  }
}

export function CategoryEditor({
  category,
  onClose,
}: {
  category?: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    imageUrl: string | null;
    sortOrder: number;
    specSchema: SpecField[];
  };
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveCategory, null);
  useResyncAfterAction(state);
  const [rows, setRows] = useState<Row[]>((category?.specSchema ?? []).map(toRow));
  const e = state?.errors ?? {};
  const val = (k: string, fallback: string) => state?.values?.[k] ?? fallback;
  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onClose();
    }
  }, [state, router, onClose]);
  const set = (i: number, patch: Partial<Row>) =>
    setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <form action={action} className={`${card} space-y-4 p-5`}>
      {category && <input type="hidden" name="id" value={category.id} />}
      <input type="hidden" name="specSchema" value={JSON.stringify(rows.map(toField))} />
      <div className="grid gap-3 md:grid-cols-4">
        {(
          [
            ["name", tc.name, category?.name ?? "", false],
            ["slug", tc.slug, category?.slug ?? "", true],
            ["sortOrder", tc.sortOrder, String(category?.sortOrder ?? 0), true],
          ] as const
        ).map(([name, label, value, ltr]) => (
          <div key={name} className="flex flex-col gap-1">
            <label htmlFor={`c-${name}`} className="text-sm font-medium">
              {label}
            </label>
            <input
              id={`c-${name}`}
              name={name}
              defaultValue={val(name, value)}
              dir={ltr ? "ltr" : undefined}
              aria-invalid={!!e[name]}
              className={`${inputCls} ${e[name] ? "border-bad" : ""}`}
            />
            {e[name] && <small className="text-bad text-xs">{e[name]}</small>}
          </div>
        ))}
        <div className="flex flex-col gap-1">
          <label htmlFor="c-icon" className="text-sm font-medium">
            {tc.icon}
          </label>
          <FormSelect
            id="c-icon"
            name="icon"
            defaultValue={val("icon", category?.icon ?? "coffee")}
            className={inputCls}
          >
            {CATEGORY_ICONS.map((i) => (
              <option key={i} value={i} dir="ltr">
                {i}
              </option>
            ))}
          </FormSelect>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {category?.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- پیش‌نمایش پنل
          <img
            src={category.imageUrl}
            alt={category.name}
            className="border-line size-16 rounded-full border object-cover"
          />
        )}
        <div className="flex flex-col gap-1">
          <label htmlFor="c-image" className="text-sm font-medium">
            {tc.image}
          </label>
          <input
            id="c-image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="text-sm"
          />
          <small className="text-steel text-xs">{tc.imageHint}</small>
          {e.image && <small className="text-bad text-xs">{e.image}</small>}
        </div>
        {category?.imageUrl && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="removeImage" className="accent-copper size-4" />
            {tc.removeImage}
          </label>
        )}
      </div>

      <fieldset className="space-y-3">
        <legend className="mb-2 font-bold">{tc.schema}</legend>
        {e.specSchema && <p className="text-bad text-sm">{e.specSchema}</p>}
        {rows.map((r, i) => (
          <div
            key={i}
            className="rounded-ctl border-line grid gap-2 border p-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]"
          >
            <input
              aria-label={tc.key}
              placeholder={tc.key}
              value={r.key}
              dir="ltr"
              onChange={(ev) => set(i, { key: ev.target.value })}
              className={`${inputCls} min-h-10 text-sm`}
            />
            <input
              aria-label={tc.label}
              placeholder={tc.label}
              value={r.label}
              onChange={(ev) => set(i, { label: ev.target.value })}
              className={`${inputCls} min-h-10 text-sm`}
            />
            <FormSelect
              aria-label={tc.type}
              value={r.type}
              onChange={(ev) => set(i, { type: ev.target.value as Row["type"] })}
              className={`${inputCls} min-h-10 text-sm`}
            >
              {Object.entries(tc.types).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </FormSelect>
            {r.type === "number" ? (
              <input
                aria-label={tc.unit}
                placeholder={tc.unit}
                value={r.unit}
                onChange={(ev) => set(i, { unit: ev.target.value })}
                className={`${inputCls} min-h-10 text-sm`}
              />
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => setRows(rows.filter((_, j) => j !== i))}
              className={`${btnGhost} text-bad`}
            >
              {tc.removeField}
            </button>
            {r.type === "enum" && (
              <textarea
                aria-label={tc.options}
                placeholder={tc.options}
                value={r.options}
                rows={3}
                dir="auto"
                onChange={(ev) => set(i, { options: ev.target.value })}
                className={`${inputCls} py-2 text-sm md:col-span-4`}
              />
            )}
            <div className="flex gap-4 text-sm md:col-span-5">
              {r.type !== "text" && (
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={r.filterable}
                    onChange={(ev) => set(i, { filterable: ev.target.checked })}
                    className="accent-copper size-4"
                  />
                  {tc.filterable}
                </label>
              )}
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={r.required}
                  onChange={(ev) => set(i, { required: ev.target.checked })}
                  className="accent-copper size-4"
                />
                {tc.required}
              </label>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setRows([
              ...rows,
              {
                key: "",
                label: "",
                type: "enum",
                unit: "",
                options: "",
                filterable: true,
                required: false,
              },
            ])
          }
          className={btnGhost}
        >
          {tc.addField}
        </button>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? t.saving : t.save}
        </button>
        <button type="button" onClick={onClose} className={btnGhost}>
          {tc.cancel}
        </button>
        <span role="status" className={`text-sm ${state?.ok ? "text-ok" : "text-bad"}`}>
          {state && !state.ok ? state.message : ""}
        </span>
      </div>
    </form>
  );
}
