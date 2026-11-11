"use client";
/** آدرس‌های کاربر: افزودن، ویرایش، حذف، پیش‌فرض (FR-ACC-02، FR-CHK-03) */
import { useActionState, useEffect, useState } from "react";
import { fa } from "@/content/fa";
import { formatMobile, PROVINCES, type FormState } from "@/modules/account";
import { deleteAddress, saveAddress, setDefaultAddress } from "@/modules/account/actions";
import { Field } from "./Field";
import { FormSelect } from "@/components/FormSelect";

type Address = {
  id: string;
  title: string | null;
  province: string;
  city: string;
  postalCode: string;
  line: string;
  recipient: string;
  phone: string;
  isDefault: boolean;
};

function AddressForm({ address, onDone }: { address?: Address; onDone: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveAddress, { ok: false });
  const e = state.errors ?? {};
  const f = fa.account.fields;
  // پس از خطا، مقدار واردشده (نه مقدار قبلی) نمایش داده شود
  const v = (k: keyof Address) => state.values?.[k] ?? (address?.[k] as string | undefined) ?? "";
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);
  return (
    <form action={action} className="rounded-card border-line bg-surface grid gap-4 border p-5">
      {address && <input type="hidden" name="id" value={address.id} />}
      <Field name="title" label={f.title} defaultValue={v("title")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="f-province" className="text-sm font-medium">
            {f.province}
          </label>
          <FormSelect
            id="f-province"
            name="province"
            key={v("province")}
            defaultValue={v("province")}
            aria-invalid={!!e.province}
            className={`rounded-ctl bg-surface min-h-12 border-[1.5px] px-3 ${e.province ? "border-bad" : "border-line"}`}
          >
            <option value="" disabled>
              {fa.account.chooseProvince}
            </option>
            {PROVINCES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </FormSelect>
          {e.province && <span className="text-bad text-xs">{e.province}</span>}
        </div>
        <Field
          name="city"
          label={f.city}
          defaultValue={v("city")}
          error={e.city}
          autoComplete="address-level2"
        />
      </div>
      <Field
        name="line"
        label={f.line}
        defaultValue={v("line")}
        error={e.line}
        autoComplete="street-address"
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          name="postalCode"
          label={f.postalCode}
          defaultValue={v("postalCode")}
          error={e.postalCode}
          inputMode="numeric"
          dir="ltr"
          autoComplete="postal-code"
        />
        <Field
          name="recipient"
          label={f.recipient}
          defaultValue={v("recipient")}
          error={e.recipient}
          autoComplete="name"
        />
        <Field
          name="phone"
          label={f.phone}
          defaultValue={v("phone")}
          error={e.phone}
          inputMode="tel"
          dir="ltr"
          autoComplete="tel"
        />
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-ctl bg-copper text-copper-ink min-h-12 px-6 font-bold disabled:opacity-60"
        >
          {fa.account.save}
        </button>
        <button type="button" onClick={onDone} className="rounded-ctl text-ink-2 min-h-12 px-4">
          {fa.account.cancel}
        </button>
      </div>
    </form>
  );
}

export function AddressBook({
  addresses,
  startNew = false,
}: {
  addresses: Address[];
  startNew?: boolean;
}) {
  const [editing, setEditing] = useState<string | "new" | null>(startNew ? "new" : null);
  const done = () => setEditing(null);
  return (
    <div className="space-y-4">
      {addresses.length === 0 && editing !== "new" && (
        <p className="text-steel text-sm">{fa.account.noAddresses}</p>
      )}
      <ul className="space-y-3">
        {addresses.map((a) =>
          editing === a.id ? (
            <li key={a.id}>
              <AddressForm address={a} onDone={done} />
            </li>
          ) : (
            <li
              key={a.id}
              className={`rounded-card bg-surface border p-4 ${a.isDefault ? "border-ink" : "border-line"}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <b>{a.title ?? a.city}</b>
                {a.isDefault && (
                  <span className="rounded-chip bg-ink text-bg px-2 text-xs">
                    {fa.account.default}
                  </span>
                )}
              </div>
              <p className="text-ink-2 mt-1 text-sm">
                {a.province}، {a.city}، {a.line}
              </p>
              <p className="text-steel text-xs">
                {fa.account.fields.postalCode}: <span dir="ltr">{a.postalCode}</span> ·{" "}
                {a.recipient} · {formatMobile(a.phone)}
              </p>
              <div className="mt-2 flex gap-4 text-sm">
                <button type="button" onClick={() => setEditing(a.id)} className="text-copper">
                  {fa.account.editAddress}
                </button>
                {!a.isDefault && (
                  <button
                    type="button"
                    onClick={() => void setDefaultAddress(a.id)}
                    className="text-ink-2"
                  >
                    {fa.account.setDefault}
                  </button>
                )}
                <button type="button" onClick={() => void deleteAddress(a.id)} className="text-bad">
                  {fa.account.deleteAddress}
                </button>
              </div>
            </li>
          ),
        )}
      </ul>
      {editing === "new" ? (
        <AddressForm onDone={done} />
      ) : (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="rounded-ctl border-ink min-h-11 border-[1.5px] px-4 text-sm font-bold"
        >
          {fa.account.addAddress}
        </button>
      )}
    </div>
  );
}
