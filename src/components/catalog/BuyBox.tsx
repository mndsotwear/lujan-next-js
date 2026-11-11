"use client";
/** انتخاب تنوع (رنگ/مدل)، قیمت، موجودی و دکمه‌ی خرید (FR-CAT-03، FR-CAT-04). */
import { useState } from "react";
import { fa } from "@/content/fa";
import type { NotifyState } from "@/modules/catalog";
import { AddToCartButton } from "../cart/AddToCartButton";
import { QtyStepper } from "../cart/QtyStepper";
import { Price } from "../Price";
import { StockBadge } from "../StockBadge";
import { NotifyForm } from "./NotifyForm";

type V = {
  id: string;
  sku: string;
  label: string;
  price: number;
  oldPrice: number | null;
  stock: "in_stock" | "low" | "out";
  available: number;
};
type Action = (prev: NotifyState, form: FormData) => Promise<NotifyState>;

export function BuyBox({
  variants,
  notifyAction,
  productName,
}: {
  variants: V[];
  notifyAction: Action;
  productName: string;
}) {
  const firstInStock = variants.find((v) => v.stock !== "out") ?? variants[0];
  const [id, setId] = useState(firstInStock?.id);
  const [qty, setQty] = useState(1);
  const v = variants.find((x) => x.id === id) ?? firstInStock;
  if (!v) return null;
  return (
    <div className="space-y-4">
      {variants.length > 1 && (
        <fieldset>
          <legend className="mb-2 text-sm font-bold">
            {fa.product.variant}: <span className="font-normal">{v.label}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((x) => (
              <label key={x.id} className="relative">
                <input
                  type="radio"
                  name="variant"
                  value={x.id}
                  checked={x.id === v.id}
                  onChange={() => {
                    setId(x.id);
                    setQty(1);
                  }}
                  className="peer absolute opacity-0"
                />
                <span className="rounded-ctl border-line bg-surface peer-checked:border-ink flex min-h-11 cursor-pointer items-center border-[1.5px] px-4 text-sm peer-checked:font-bold peer-focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--c-copper)_45%,transparent)]">
                  {x.label}
                  {x.stock === "out" && (
                    <span className="text-steel ms-1 text-xs">({fa.stock.out})</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="rounded-card border-line bg-surface border p-5">
        <Price price={v.price} oldPrice={v.oldPrice} size="lg" />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <StockBadge stock={v.stock} available={v.available} />
          <span className="text-steel text-xs" dir="ltr">
            {fa.product.sku}: {v.sku}
          </span>
        </div>
        <div className="mt-4">
          {v.stock === "out" ? (
            <NotifyForm key={v.id} variantId={v.id} action={notifyAction} />
          ) : (
            <div className="flex gap-3">
              <QtyStepper
                size="md"
                value={qty}
                max={Math.min(v.available, 20)}
                onChange={(n) => setQty(Math.max(1, n))}
              />
              <AddToCartButton variantId={v.id} name={productName} qty={qty} className="flex-1" />
            </div>
          )}
        </div>
        <ul className="border-line mt-3 grid gap-2 border-t pt-4 text-sm">
          {fa.product.delivery.map((d) => (
            <li key={d.label} className="flex justify-between gap-2">
              <span>{d.label}</span>
              <span className="text-ink-2">{d.eta}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
