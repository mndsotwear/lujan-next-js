import Link from "next/link";
import { fa } from "@/content/fa";
import type { ProductSummary } from "@/modules/catalog";
import { AddToCartButton } from "./cart/AddToCartButton";
import Image from "next/image";
import { Icon } from "./Icon";
import { Price } from "./Price";
import { Rating } from "./Rating";
import { StockBadge } from "./StockBadge";

/** کارت محصول لوجان: تصویر روی زمینه‌ی رنگی، نشان درصد تخفیف، قیمت درشت و دکمه‌ی افزودن (طرح مارکت‌پلیس). */
export function ProductCard({
  p,
  specChips = [],
  reason,
}: {
  p: ProductSummary;
  specChips?: string[];
  reason?: string | null;
}) {
  const href = `/products/${p.slug}`;
  const tag = p.tags[0];
  const off = p.oldPrice ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0;
  return (
    <article className="rounded-sheet border-line bg-surface text-ink shadow-card group flex h-full flex-col overflow-hidden border transition-all hover:-translate-y-1 hover:shadow-[0_18px_40px_-16px_rgb(20_60_140/0.45)]">
      <Link
        href={href}
        className="from-copper-soft to-surface-2 text-copper relative grid aspect-[4/3] place-items-center bg-gradient-to-br"
        tabIndex={-1}
        aria-hidden
      >
        {off > 0 && (
          <span className="bg-bad absolute start-3 top-3 z-[1] grid h-8 min-w-12 place-items-center rounded-full px-2 text-sm font-black text-white shadow">
            {fa.product.off(off)}
          </span>
        )}
        {tag && (
          <span className="text-ink absolute end-3 top-3 z-[1] rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-bold shadow-sm">
            {tag}
          </span>
        )}
        {p.image ? (
          <Image
            src={p.image.url}
            alt={p.image.alt}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <Icon
            name={p.icon}
            className="w-[44%] transition-transform duration-300 group-hover:scale-110"
          />
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-4 max-sm:p-3">
        <span className="text-steel text-xs">{p.brandName}</span>
        <h3 className="line-clamp-2 min-h-[3.2em] text-[15px] leading-relaxed font-bold">
          <Link href={href} className="hover:text-copper">
            {p.name}
          </Link>
        </h3>
        {reason && <p className="text-copper text-xs">{reason}</p>}
        {specChips.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {specChips.slice(0, 2).map((s) => (
              <li key={s} className="rounded-chip bg-surface-2 text-ink-2 px-2 text-xs">
                {s}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Rating avg={p.ratingAvg} count={p.ratingCount} />
          <StockBadge stock={p.stock} available={p.available} />
        </div>
        <div className="mt-auto pt-3">
          <Price price={p.price} oldPrice={p.oldPrice} badge={false} />
        </div>
        {p.stock !== "out" && p.variantCount === 1 && p.defaultVariantId ? (
          <AddToCartButton
            variantId={p.defaultVariantId}
            name={p.name}
            className="mt-1 min-h-11 text-sm"
          />
        ) : (
          <Link
            href={href}
            className="border-copper text-copper hover:bg-copper hover:text-copper-ink mt-1 grid min-h-11 place-items-center rounded-full border-[1.5px] px-3 text-sm font-bold transition-colors"
          >
            {p.stock === "out" ? fa.card.notifyMe : fa.cart.chooseVariant}
          </Link>
        )}
      </div>
    </article>
  );
}
