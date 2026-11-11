"use client";
/** تعیین دستی حساب عمده (D-046) */
import { useActionState, useState } from "react";
import { fa } from "@/content/fa";
import { saveWholesale } from "@/modules/account/admin-actions";
import { btnPrimary, inputCls } from "./ui";
import { FormSelect } from "@/components/FormSelect";

export function WholesaleForm({
  userId,
  initial,
}: {
  userId: string;
  initial: {
    wholesale: boolean;
    orgName: string;
    nationalId: string;
    economicCode: string;
    priceLevel: number;
  };
}) {
  const t = fa.admin.customers;
  const [state, action, pending] = useActionState(saveWholesale, null);
  const v = state?.values;
  const [on, setOn] = useState(initial.wholesale);
  const field = (name: string, label: string, value: string, ltr = false) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`w-${name}`} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={`w-${name}`}
        name={name}
        defaultValue={v?.[name] ?? value}
        dir={ltr ? "ltr" : undefined}
        className={inputCls}
      />
    </div>
  );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="userId" value={userId} />
      <p className="text-ink-2 text-sm leading-7">{t.wholesaleHint}</p>
      <label className="flex items-center gap-2 font-medium">
        <input
          type="checkbox"
          name="wholesale"
          checked={on}
          onChange={(e) => setOn(e.target.checked)}
          className="accent-copper size-[18px]"
        />
        {t.isWholesale}
      </label>
      {on && (
        <div className="grid gap-3 sm:grid-cols-2">
          {field("orgName", t.orgName, initial.orgName)}
          {field("nationalId", t.nationalId, initial.nationalId, true)}
          {field("economicCode", t.economicCode, initial.economicCode, true)}
          <div className="flex flex-col gap-1">
            <label htmlFor="w-priceLevel" className="text-sm font-medium">
              {t.priceLevel}
            </label>
            <FormSelect
              id="w-priceLevel"
              name="priceLevel"
              defaultValue={v?.priceLevel ?? String(initial.priceLevel)}
              className={inputCls}
            >
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {n.toLocaleString("fa-IR")}
                </option>
              ))}
            </FormSelect>
          </div>
        </div>
      )}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {t.save}
        </button>
        <span role="status" className={`text-sm ${state?.ok ? "text-ok" : "text-bad"}`}>
          {state?.message ?? ""}
        </span>
      </div>
    </form>
  );
}
