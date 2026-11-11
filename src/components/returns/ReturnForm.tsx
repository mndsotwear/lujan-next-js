"use client";
/** فرم درخواست مرجوعی یا تعویض (FR-RET-01، D-030) */
import Link from "next/link";
import { useActionState, useState } from "react";
import { STORE } from "@/config/store";
import { fa } from "@/content/fa";
import {
  RETURN_REASONS,
  RETURN_TYPES,
  returnShippingPayer,
  type ReturnReason,
} from "@/modules/returns";
import { requestReturn } from "@/modules/returns/actions";
import { FormSelect } from "@/components/FormSelect";

type Item = { id: string; name: string; max: number };

export function ReturnForm({
  orderNumber,
  items,
  savedIban,
}: {
  orderNumber: number;
  items: Item[];
  savedIban: string;
}) {
  const t = fa.returns;
  const [state, action, pending] = useActionState(requestReturn, null);
  const v = state?.values;
  const [picked, setReason] = useState<ReturnReason | null>(null);
  const reason = picked ?? ((v?.reasonCode as ReturnReason | undefined) || null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [pickedType, setType] = useState<string | null>(null);
  const type = pickedType ?? (v?.type || "REFUND");

  if (state?.ok)
    return (
      <p role="status" className="rounded-ctl bg-surface-2 text-ok p-4 text-sm font-medium">
        {state.message}
      </p>
    );

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const err =
      files.length > STORE.returns.maxImages
        ? t.errors.images
        : files.some((f) => f.size > STORE.returns.maxImageBytes)
          ? t.errors.imageSize
          : null;
    setFileError(err);
    if (err) e.target.value = "";
  };

  const box = "rounded-ctl border-line bg-surface border-[1.5px] px-3";
  return (
    <details className="rounded-card border-line border" open={!!state}>
      <summary className="cursor-pointer px-4 py-3 font-bold">{t.request}</summary>
      <form action={action} className="space-y-5 px-4 pb-5">
        <input type="hidden" name="orderNumber" value={orderNumber} />
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">{t.chooseItems}</legend>
          {items.map((it) => (
            <label key={it.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0">{it.name}</span>
              <span className="flex shrink-0 items-center gap-2">
                <FormSelect
                  name={`qty_${it.id}`}
                  key={`q-${v?.qty[it.id] ?? 0}`}
                  defaultValue={String(v?.qty[it.id] ?? 0)}
                  aria-label={`${it.name} — ${t.qtyOf(it.max)}`}
                  className={`${box} min-h-10`}
                >
                  {Array.from({ length: it.max + 1 }, (_, n) => (
                    <option key={n} value={n}>
                      {n.toLocaleString("fa-IR")}
                    </option>
                  ))}
                </FormSelect>
                <small className="text-steel">{t.qtyOf(it.max)}</small>
              </span>
            </label>
          ))}
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">{t.reason}</legend>
          {RETURN_REASONS.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="reasonCode"
                value={r}
                required
                defaultChecked={v?.reasonCode === r}
                onChange={() => setReason(r)}
                className="accent-copper size-4"
              />
              {t.reasons[r]}
            </label>
          ))}
          {reason && (
            <p
              className={`text-xs ${returnShippingPayer(reason) === "STORE" ? "text-ok" : "text-ink-2"}`}
            >
              {t.payer[returnShippingPayer(reason)]}
            </p>
          )}
        </fieldset>
        <fieldset className="flex flex-wrap gap-4">
          <legend className="mb-2 text-sm font-medium">{t.type}</legend>
          {RETURN_TYPES.map((x, i) => (
            <label key={x} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="type"
                value={x}
                defaultChecked={v ? v.type === x : i === 0}
                onChange={() => setType(x)}
                className="accent-copper size-4"
              />
              {t.types[x]}
            </label>
          ))}
        </fieldset>
        {type === "REFUND" && (
          <div className="flex flex-col gap-1">
            <label htmlFor="ret-iban" className="text-sm font-medium">
              {t.ibanLabel}
            </label>
            <input
              id="ret-iban"
              name="iban"
              required
              dir="ltr"
              autoComplete="off"
              defaultValue={v?.iban ?? savedIban}
              placeholder="IR00 0000 0000 0000 0000 0000 00"
              aria-describedby="ret-iban-hint"
              className={`${box} min-h-11`}
            />
            <small id="ret-iban-hint" className="text-steel text-xs">
              {t.ibanHint}
            </small>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label htmlFor="ret-desc" className="text-sm font-medium">
            {t.description}
          </label>
          <textarea
            id="ret-desc"
            name="description"
            required
            minLength={10}
            maxLength={1000}
            rows={3}
            defaultValue={v?.description}
            aria-describedby="ret-desc-hint"
            className={`${box} py-2`}
          />
          <small id="ret-desc-hint" className="text-steel text-xs">
            {t.descriptionHint}
          </small>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="ret-images" className="text-sm font-medium">
            {t.images}
          </label>
          <input
            id="ret-images"
            name="images"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={onFiles}
            aria-describedby="ret-images-hint"
            className="file:bg-surface-2 text-sm file:me-3 file:rounded-[8px] file:border-0 file:px-3 file:py-2"
          />
          <small id="ret-images-hint" className="text-steel text-xs">
            {t.imagesHint}
          </small>
          {fileError && <small className="text-bad text-xs">{fileError}</small>}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={pending || !!fileError}
            className="rounded-ctl bg-ink text-bg min-h-12 px-6 font-bold disabled:opacity-60"
          >
            {pending ? t.submitting : t.submit}
          </button>
          <Link href="/returns" className="text-copper text-sm underline">
            {fa.checkout.returnsLink}
          </Link>
        </div>
        <p role="alert" className="text-bad min-h-5 text-sm">
          {state && !state.ok ? state.message : ""}
        </p>
      </form>
    </details>
  );
}
