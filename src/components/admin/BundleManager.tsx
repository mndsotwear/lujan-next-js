"use client";
/** بسته‌های ترکیبی «با هم ارزان‌تر»: ۲ تا ۴ محصول با درصد تخفیف */
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { fa } from "@/content/fa";
import { deleteBundle, saveBundle } from "@/modules/promotions/actions";
import { ProductPicker } from "./ProductPicker";
import { btnGhost, btnPrimary, card, inputCls } from "./ui";

export type BundleRow = {
  id: string;
  title: string;
  percent: number;
  productIds: string[];
  isActive: boolean;
  sortOrder: number;
};
const t = fa.admin.marketing.bundles;

function BundleForm({
  b,
  products,
  onDone,
}: {
  b?: BundleRow;
  products: { id: string; name: string }[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveBundle, null);
  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onDone();
    }
  }, [state, router, onDone]);
  const v = state && !state.ok ? state.values : undefined;
  const id = b?.id ?? "n";
  const field = (name: "title" | "percent" | "sortOrder", label: string, ltr = false) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`bd-${id}-${name}`} className="text-xs font-medium">
        {label}
      </label>
      <input
        id={`bd-${id}-${name}`}
        name={name}
        defaultValue={v?.[name] ?? (b ? String(b[name]) : name === "sortOrder" ? "0" : "")}
        dir={ltr ? "ltr" : undefined}
        className={`${inputCls} min-h-10 text-sm`}
      />
    </div>
  );
  return (
    <form action={action} className="space-y-3">
      {b && <input type="hidden" name="id" value={b.id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        {field("title", t.title)}
        {field("percent", t.percent, true)}
        {field("sortOrder", t.sortOrder, true)}
      </div>
      <ProductPicker options={products} initial={b?.productIds ?? []} label={t.products} max={4} />
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={v ? v.isActive === "on" : (b?.isActive ?? true)}
            className="accent-copper size-4"
          />
          {t.isActive}
        </label>
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? t.saving : t.save}
        </button>
        <button type="button" onClick={onDone} className={btnGhost}>
          {t.cancel}
        </button>
        <span role="status" className="text-bad text-sm">
          {state && !state.ok ? state.message : ""}
        </span>
      </div>
    </form>
  );
}

export function BundleManager({
  bundles,
  products,
}: {
  bundles: BundleRow[];
  products: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const done = () => setEditing(null);
  const names = new Map(products.map((p) => [p.id, p.name]));
  return (
    <div className="space-y-3">
      <p className="text-ink-2 text-sm">{t.intro}</p>
      {editing === "new" ? (
        <div className={`${card} p-4`}>
          <BundleForm products={products} onDone={done} />
        </div>
      ) : (
        <button type="button" onClick={() => setEditing("new")} className={btnPrimary}>
          {t.new}
        </button>
      )}
      {bundles.length === 0 && <p className="text-ink-2 text-sm">{t.empty}</p>}
      {bundles.map((b) => (
        <div key={b.id} className={`${card} p-4`}>
          {editing === b.id ? (
            <BundleForm b={b} products={products} onDone={done} />
          ) : (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="min-w-0 flex-1">
                <b>{b.title}</b>{" "}
                <span className="rounded-full bg-[#c81e3a] px-2 py-0.5 text-xs font-bold text-white">
                  {b.percent.toLocaleString("fa-IR")}٪
                </span>
                <span className={`ms-2 text-xs ${b.isActive ? "text-ok" : "text-steel"}`}>
                  {b.isActive ? t.active : t.inactive}
                </span>
                <span className="text-ink-2 block text-xs">
                  {b.productIds.map((id) => names.get(id) ?? t.missing).join(" + ")}
                </span>
              </div>
              <button type="button" onClick={() => setEditing(b.id)} className={btnGhost}>
                {t.edit}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(t.confirmRemove))
                    start(async () => {
                      await deleteBundle(b.id);
                      router.refresh();
                    });
                }}
                className={`${btnGhost} text-bad`}
              >
                {t.remove}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
