"use client";
/** نوع‌های محصول: کد، ویژگی، قیمت (فقط مدیر کل، D-042)، وزن و ابعاد (D-029) */
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { fa } from "@/content/fa";
import { saveVariant } from "@/modules/catalog/admin-actions";
import { btnGhost, btnPrimary, card, inputCls } from "./ui";

export type VariantRow = {
  id: string;
  sku: string;
  attributes: string;
  price: number;
  salePrice: number | null;
  wholesale: number | null;
  costPrice: number | null;
  weightGrams: number;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  minOrderQty: number;
  isActive: boolean;
  available: number;
};

const t = fa.admin.catalog;
const tv = t.variants;
const str = (n: number | null | undefined) =>
  n === null || n === undefined || n === 0 ? "" : String(n);

/** ویژگی‌ها به‌صورت جفت «نام / مقدار»؛ برای سرور همان قالب «کلید: مقدار» در یک فیلد پنهان */
function AttributeRows({ id, initial, error }: { id: string; initial: string; error?: string }) {
  const parse = (text: string) => {
    const rows = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const i = l.indexOf(":");
        return i > 0 ? { k: l.slice(0, i).trim(), v: l.slice(i + 1).trim() } : { k: "", v: l };
      });
    return rows.length ? rows : [{ k: "", v: "" }];
  };
  const [rows, setRows] = useState(() => parse(initial));
  const serialized = rows
    .filter((r) => r.k.trim() || r.v.trim())
    .map((r) => `${r.k.trim().replace(/:/g, "")}: ${r.v.trim()}`)
    .join("\n");
  const set = (i: number, patch: Partial<{ k: string; v: string }>) =>
    setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-xs font-medium">{tv.attributes}</legend>
      <input type="hidden" name="attributes" value={serialized} />
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-2 gap-2">
          <input
            aria-label={tv.attrName}
            placeholder={tv.attrName}
            value={r.k}
            onChange={(ev) => set(i, { k: ev.target.value })}
            className={`${inputCls} min-h-10 text-sm`}
          />
          <input
            aria-label={tv.attrValue}
            placeholder={tv.attrValue}
            value={r.v}
            onChange={(ev) => set(i, { v: ev.target.value })}
            className={`${inputCls} min-h-10 text-sm`}
          />
        </div>
      ))}
      <div className="flex items-center justify-between gap-2">
        <small className={`text-xs ${error ? "text-bad" : "text-steel"}`} id={`${id}-attr-hint`}>
          {error ?? tv.attributesHint}
        </small>
        {rows.length < 4 && (
          <button
            type="button"
            onClick={() => setRows([...rows, { k: "", v: "" }])}
            className="text-copper text-xs underline"
          >
            {tv.addAttr}
          </button>
        )}
      </div>
    </fieldset>
  );
}

function VariantForm({
  productId,
  v,
  canPrice,
  onDone,
}: {
  productId: string;
  v?: VariantRow;
  canPrice: boolean;
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState(saveVariant, null);
  const e = state?.errors ?? {};
  const val = (k: string, fallback: string) => state?.values?.[k] ?? fallback;
  useEffect(() => {
    if (state?.ok && !v) onDone?.();
  }, [state, v, onDone]);
  const field = (
    name: string,
    label: string,
    value: string,
    opts: { ltr?: boolean; disabled?: boolean } = {},
  ) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`${v?.id ?? "new"}-${name}`} className="text-xs font-medium">
        {label}
      </label>
      <input
        id={`${v?.id ?? "new"}-${name}`}
        name={name}
        defaultValue={val(name, value)}
        dir={opts.ltr ? "ltr" : undefined}
        disabled={opts.disabled}
        inputMode={opts.ltr ? undefined : "numeric"}
        aria-invalid={!!e[name]}
        className={`${inputCls} min-h-10 text-sm ${e[name] ? "border-bad" : ""} disabled:opacity-60`}
      />
      {e[name] && <small className="text-bad text-xs">{e[name]}</small>}
    </div>
  );
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="productId" value={productId} />
      {v && <input type="hidden" name="variantId" value={v.id} />}
      <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
        <div>
          {field("sku", tv.sku, v?.sku ?? "", { ltr: true })}
          {!v && !e.sku && <small className="text-steel text-xs">{tv.skuHint}</small>}
        </div>
        <AttributeRows
          id={v?.id ?? "new"}
          initial={val("attributes", v?.attributes ?? "")}
          error={e.attributes}
        />
      </div>
      <div className={`grid gap-3 ${canPrice ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
        {field("price", tv.price, str(v?.price), { disabled: !canPrice })}
        {field("salePrice", tv.salePrice, str(v?.salePrice), { disabled: !canPrice })}
        {field("wholesale", tv.wholesale, str(v?.wholesale), { disabled: !canPrice })}
        {/* قیمت خرید فقط برای مدیر کل نمایش داده می‌شود (D-050) */}
        {canPrice && field("costPrice", tv.costPrice, str(v?.costPrice))}
      </div>
      {!canPrice && <p className="text-copper text-xs">{tv.priceAdminOnly}</p>}
      <div className="grid gap-3 sm:grid-cols-5">
        {field("weightGrams", tv.weightGrams, str(v?.weightGrams))}
        {field("lengthCm", tv.lengthCm, str(v?.lengthCm))}
        {field("widthCm", tv.widthCm, str(v?.widthCm))}
        {field("heightCm", tv.heightCm, str(v?.heightCm))}
        {field("minOrderQty", tv.minOrderQty, String(v?.minOrderQty ?? 1))}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={state?.values ? state.values.isActive === "on" : (v?.isActive ?? false)}
            className="accent-copper size-4"
          />
          {tv.isActive}
        </label>
        {e.isActive && <small className="text-bad text-xs">{e.isActive}</small>}
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? t.saving : t.save}
        </button>
        <span role="status" className={`text-sm ${state?.ok ? "text-ok" : "text-bad"}`}>
          {state?.message ?? ""}
        </span>
      </div>
    </form>
  );
}

export function VariantEditor({
  productId,
  variants,
  canPrice,
}: {
  productId: string;
  variants: VariantRow[];
  canPrice: boolean;
}) {
  const [adding, setAdding] = useState(variants.length === 0);
  return (
    <div className="space-y-4">
      {variants.map((v) => (
        <details key={v.id} className={`${card} p-4`} open={variants.length === 1}>
          <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <b dir="ltr">{v.sku}</b>
            <span className="text-ink-2">{v.attributes.replace(/\n/g, "، ") || "—"}</span>
            <span>{v.price ? (v.salePrice ?? v.price).toLocaleString("fa-IR") : t.noPrice}</span>
            <span className={v.available === 0 ? "text-bad" : "text-ink-2"}>
              {tv.stock(v.available)}
            </span>
            {!v.isActive && <span className="text-bad">{tv.inactive}</span>}
            <Link
              href={`/admin/inventory?q=${encodeURIComponent(v.sku)}`}
              className="text-copper ms-auto underline"
            >
              {tv.stockLink}
            </Link>
          </summary>
          <div className="pt-4">
            <VariantForm productId={productId} v={v} canPrice={canPrice} />
          </div>
        </details>
      ))}
      {adding ? (
        <div className={`${card} p-4`}>
          <h3 className="mb-3 font-bold">{tv.add}</h3>
          <VariantForm productId={productId} canPrice={canPrice} onDone={() => setAdding(false)} />
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={btnGhost}>
          {tv.add}
        </button>
      )}
    </div>
  );
}
