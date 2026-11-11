"use client";
/** کدهای تخفیف (FR-ADM-06، D-047) */
import { useActionState, useEffect, useState } from "react";
import { fa } from "@/content/fa";
import { useResyncAfterAction } from "./useResyncAfterAction";
import { saveCoupon } from "@/modules/cart/admin-actions";
import { btnGhost, btnPrimary, card, inputCls } from "./ui";
import { FormSelect } from "@/components/FormSelect";

export type CouponRow = {
  id: string;
  code: string;
  type: string;
  value: number;
  minSubtotal: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  used: number;
  expired: boolean;
};

const t = fa.admin.marketing.coupons;
const num = (n: number | null) => (n === null || n === undefined ? "" : String(n));

function CouponForm({ c, onDone }: { c?: CouponRow; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveCoupon, null);
  useResyncAfterAction(state);
  const v = state?.values;
  const [type, setType] = useState(v?.type ?? c?.type ?? "PERCENT");
  useEffect(() => {
    if (state?.ok && !c) onDone();
  }, [state, c, onDone]);
  const f = (name: string, label: string, value: string, hint?: string) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`cp-${c?.id ?? "n"}-${name}`} className="text-xs font-medium">
        {label}
      </label>
      <input
        id={`cp-${c?.id ?? "n"}-${name}`}
        name={name}
        defaultValue={v?.[name] ?? value}
        dir="ltr"
        className={`${inputCls} min-h-10 text-sm`}
      />
      {hint && <small className="text-steel text-[11px]">{hint}</small>}
    </div>
  );
  return (
    <form action={action} className="space-y-3">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        {f("code", t.code, c?.code ?? "")}
        <div className="flex flex-col gap-1">
          <label htmlFor={`cp-${c?.id ?? "n"}-type`} className="text-xs font-medium">
            {t.type}
          </label>
          <FormSelect
            id={`cp-${c?.id ?? "n"}-type`}
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={`${inputCls} min-h-10 text-sm`}
          >
            {Object.entries(t.types).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </FormSelect>
        </div>
        {type !== "FREE_SHIPPING" && f("value", t.value, num(c?.value ?? null))}
        {f("minSubtotal", t.minSubtotal, num(c?.minSubtotal ?? 0))}
        {type === "PERCENT" &&
          f("maxDiscount", t.maxDiscount, num(c?.maxDiscount ?? null), t.unlimited)}
        {f("usageLimit", t.usageLimit, num(c?.usageLimit ?? null), t.unlimited)}
        {f("perCustomerLimit", t.perCustomerLimit, c ? num(c.perCustomerLimit) : "1", t.unlimited)}
        {f("startsAt", t.startsAt, c?.startsAt ?? "")}
        {f("endsAt", t.endsAt, c?.endsAt ?? "")}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={v ? v.isActive === "on" : (c?.isActive ?? true)}
            className="accent-copper size-4"
          />
          {t.isActive}
        </label>
        <button type="submit" disabled={pending} className={btnPrimary}>
          {t.save}
        </button>
        <button type="button" onClick={onDone} className={btnGhost}>
          {t.cancel}
        </button>
        <span role="status" className={`text-sm ${state?.ok ? "text-ok" : "text-bad"}`}>
          {state?.message ?? ""}
        </span>
      </div>
    </form>
  );
}

export function CouponManager({ coupons }: { coupons: CouponRow[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const done = () => setEditing(null);
  return (
    <div className="space-y-3">
      {editing === "new" ? (
        <div className={`${card} p-4`}>
          <CouponForm onDone={done} />
        </div>
      ) : (
        <button type="button" onClick={() => setEditing("new")} className={btnPrimary}>
          {t.new}
        </button>
      )}
      {coupons.length === 0 && <p className="text-ink-2 text-sm">{t.empty}</p>}
      {coupons.map((c) => (
        <div key={c.id} className={`${card} p-4`}>
          {editing === c.id ? (
            <CouponForm c={c} onDone={done} />
          ) : (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <b dir="ltr" className="font-mono text-base">
                {c.code}
              </b>
              <span>
                {t.types[c.type]}
                {c.type === "PERCENT"
                  ? ` ${c.value.toLocaleString("fa-IR")}٪`
                  : c.type === "FIXED"
                    ? ` ${c.value.toLocaleString("fa-IR")}`
                    : ""}
              </span>
              <span className="text-ink-2">{t.used(c.used, c.usageLimit)}</span>
              <span className="text-ink-2">{t.perCustomer(c.perCustomerLimit)}</span>
              {(c.startsAt || c.endsAt) && (
                <span dir="ltr" className="text-ink-2">
                  {c.startsAt || "…"} → {c.endsAt || "…"}
                </span>
              )}
              {!c.isActive && <span className="text-bad">{t.inactive}</span>}
              {c.expired && <span className="text-bad">{t.expired}</span>}
              <button
                type="button"
                onClick={() => setEditing(c.id)}
                className={`${btnGhost} ms-auto`}
              >
                {t.edit}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
