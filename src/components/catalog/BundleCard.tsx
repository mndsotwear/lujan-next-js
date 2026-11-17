"use client";
/** بسته‌ی ترکیبی «با هم ارزان‌تر»: کالاها، جمع و قیمت بسته، افزودن همه به سبد */
import Image from "next/image";
import Link from "next/link";
import { Fragment, useState } from "react";
import { fa } from "@/content/fa";
import { formatNumber } from "@/lib/format";
import type { ProductSummary } from "@/modules/catalog";
import { bundlePrice } from "@/modules/cart/bundles";
import { Icon } from "../Icon";
import { useCart } from "../cart/CartProvider";

export type BundleView = { id: string; title: string; percent: number; products: ProductSummary[] };

export function BundleCard({ b }: { b: BundleView }) {
  const { add } = useCart();
  const [busy, setBusy] = useState(false);
  const p = bundlePrice(
    b.products.map((x) => x.price),
    b.percent,
  );
  const missing = b.products.some((x) => x.stock === "out" || !x.defaultVariantId);
  return (
    <article className="rounded-card border-line bg-surface shadow-card flex flex-col gap-4 border p-4">
      <div className="flex items-center justify-between gap-2">
        <b className="text-sm">{b.title}</b>
        <span className="rounded-full bg-[#c81e3a] px-2.5 py-0.5 text-xs font-bold text-white">
          {fa.bundles.off(b.percent)}
        </span>
      </div>
      <div className="flex items-center justify-center gap-2">
        {b.products.map((x, i) => (
          <Fragment key={x.id}>
            {i > 0 && <span className="text-steel text-xl font-black">+</span>}
            <Link
              href={`/products/${x.slug}`}
              title={x.name}
              className="rounded-ctl bg-surface-2 relative grid size-20 shrink-0 place-items-center overflow-hidden"
            >
              {x.image ? (
                <Image
                  src={x.image.url}
                  alt={x.image.alt}
                  fill
                  sizes="80px"
                  className="object-contain p-1"
                />
              ) : (
                <Icon name={x.icon} className="text-steel size-10" />
              )}
            </Link>
          </Fragment>
        ))}
      </div>
      <ul className="text-ink-2 space-y-0.5 text-xs">
        {b.products.map((x) => (
          <li key={x.id} className="truncate">
            • {x.name}
          </li>
        ))}
      </ul>
      <div className="mt-auto flex items-end justify-between gap-2">
        <div>
          <s className="text-steel block text-xs">{formatNumber(p.sum)}</s>
          <b className="text-lg">
            {formatNumber(p.price)}{" "}
            <small className="text-ink-2 font-normal">{fa.units.toman}</small>
          </b>
        </div>
        <button
          type="button"
          disabled={busy || missing}
          onClick={async () => {
            setBusy(true);
            for (const x of b.products) await add(x.defaultVariantId!, 1, { name: b.title });
            setBusy(false);
          }}
          className="rounded-ctl bg-copper text-copper-ink min-h-11 px-4 text-sm font-bold disabled:opacity-50"
        >
          {missing ? fa.bundles.unavailable : busy ? fa.cart.adding : fa.bundles.addAll}
        </button>
      </div>
    </article>
  );
}
