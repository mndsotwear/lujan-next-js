"use client";
/** پیشنهاد شگفت‌انگیز: درصد تخفیف زمان‌دار روی چند محصول (FR: پیشنهاد مالک) */
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { fa } from "@/content/fa";
import { deleteDeal, saveDeals, toggleDeal, updateDeal } from "@/modules/promotions/actions";
import { ProductPicker } from "./ProductPicker";
import { btnGhost, btnPrimary, card, inputCls } from "./ui";

export type DealRow = {
  id: string;
  productName: string;
  percent: number;
  startsAt: string;
  endsAt: string;
  /** برای فرم ویرایش */
  endsAtDate: string;
  endHour: string;
  isActive: boolean;
  state: "live" | "scheduled" | "ended" | "off";
};
const t = fa.admin.marketing.deals;

/** ویرایش درصد و زمان یک پیشنهاد موجود */
function DealEditForm({ d, onDone }: { d: DealRow; onDone: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateDeal, null);
  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onDone();
    }
  }, [state, router, onDone]);
  const v = state && !state.ok ? state.values : undefined;
  const field = (
    name: "percent" | "startsAt" | "endsAt" | "endHour",
    label: string,
    value: string,
    hint?: string,
  ) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`de-${d.id}-${name}`} className="text-xs font-medium">
        {label}
      </label>
      <input
        id={`de-${d.id}-${name}`}
        name={name}
        defaultValue={v?.[name] ?? value}
        dir="ltr"
        className={`${inputCls} min-h-10 text-sm`}
      />
      {hint && <small className="text-steel text-[11px]">{hint}</small>}
    </div>
  );
  return (
    <form action={action} className="w-full space-y-3">
      <input type="hidden" name="id" value={d.id} />
      <b className="block text-sm">{d.productName}</b>
      <div className="grid gap-3 sm:grid-cols-4">
        {field("percent", t.percent, String(d.percent), t.percentHint)}
        {field("startsAt", t.startsAt, d.startsAt, t.dateHint)}
        {field("endsAt", t.endsAt, d.endsAtDate, t.dateHint)}
        {field("endHour", t.endHour, d.endHour, t.endHourHint)}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={v ? v.isActive === "on" : d.isActive}
            className="accent-copper size-4"
          />
          {t.isActive}
        </label>
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? t.saving : t.saveEdit}
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

export function DealManager({
  deals,
  products,
}: {
  deals: DealRow[];
  products: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveDeals, null);
  const [formKey, setFormKey] = useState(0);
  const [busy, start] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const closeEdit = useCallback(() => setEditing(null), []);
  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      const r = setTimeout(() => setFormKey((k) => k + 1), 0);
      return () => clearTimeout(r);
    }
  }, [state, router]);
  const v = state && !state.ok ? state.values : undefined;
  const field = (name: string, label: string, hint?: string) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`dl-${name}`} className="text-xs font-medium">
        {label}
      </label>
      <input
        id={`dl-${name}`}
        name={name}
        defaultValue={v?.[name] ?? ""}
        dir="ltr"
        className={`${inputCls} min-h-10 text-sm`}
      />
      {hint && <small className="text-steel text-[11px]">{hint}</small>}
    </div>
  );
  const act = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });
  return (
    <div className="space-y-4">
      <p className="text-ink-2 text-sm">{t.intro}</p>
      <form key={formKey} action={action} className={`${card} space-y-3 p-4`}>
        <b className="block">{t.new}</b>
        <ProductPicker options={products} initial={[]} label={t.products} max={30} />
        <div className="grid gap-3 sm:grid-cols-4">
          {field("percent", t.percent, t.percentHint)}
          {field("startsAt", t.startsAt, t.dateHint)}
          {field("endsAt", t.endsAt, t.dateHint)}
          {field("endHour", t.endHour, t.endHourHint)}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? t.saving : t.save}
          </button>
          <span role="status" className={`text-sm ${state?.ok ? "text-ok" : "text-bad"}`}>
            {state?.message ?? ""}
          </span>
        </div>
      </form>

      {deals.length === 0 ? (
        <p className="text-ink-2 text-sm">{t.empty}</p>
      ) : (
        <div className={`${card} divide-line divide-y`}>
          {deals.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              {editing === d.id ? (
                <DealEditForm d={d} onDone={closeEdit} />
              ) : (
                <>
                  <b className="min-w-0 flex-1 truncate">{d.productName}</b>
                  <span className="rounded-full bg-[#c81e3a] px-2 py-0.5 text-xs font-bold text-white">
                    {d.percent.toLocaleString("fa-IR")}٪
                  </span>
                  <span className="text-ink-2 text-xs" dir="ltr">
                    {d.startsAt ? `${d.startsAt} → ` : ""}
                    {d.endsAt}
                  </span>
                  <span
                    className={`text-xs ${d.state === "live" ? "text-ok" : d.state === "scheduled" ? "text-copper" : "text-steel"}`}
                  >
                    {t.states[d.state]}
                  </span>
                  {d.state !== "ended" && (
                    <button type="button" onClick={() => setEditing(d.id)} className={btnGhost}>
                      {t.edit}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => act(() => toggleDeal(d.id, !d.isActive))}
                    className={btnGhost}
                  >
                    {d.isActive ? t.turnOff : t.turnOn}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(t.confirmRemove)) act(() => deleteDeal(d.id));
                    }}
                    className={`${btnGhost} text-bad`}
                  >
                    {t.remove}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
