"use client";
/** گالری تصویر محصول؛ بدون تصویر، آیکون دسته (D-045) */
import Image from "next/image";
import { useState } from "react";
import { fa } from "@/content/fa";
import { Icon } from "../Icon";

export function ProductGallery({
  images,
  icon,
  tag,
}: {
  images: { url: string; alt: string }[];
  icon: string;
  tag?: string;
}) {
  const [i, setI] = useState(0);
  const main = images[i];
  return (
    <div className="space-y-3">
      <div className="rounded-sheet border-line bg-surface text-ink-2 relative grid aspect-square place-items-center overflow-hidden border">
        {tag && (
          <span className="rounded-chip bg-ink text-bg absolute start-4 top-4 z-[1] px-2 text-xs">
            {tag}
          </span>
        )}
        {main ? (
          <Image
            src={main.url}
            alt={main.alt}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 560px"
            className="object-contain p-6"
          />
        ) : (
          <Icon name={icon} className="w-[55%]" />
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto" role="group" aria-label={fa.product.gallery}>
          {images.map((img, j) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setI(j)}
              aria-label={fa.product.galleryItem(j + 1)}
              aria-pressed={i === j}
              className={`rounded-ctl bg-surface relative size-16 shrink-0 overflow-hidden border-[1.5px] ${i === j ? "border-copper" : "border-line"}`}
            >
              <Image src={img.url} alt="" fill sizes="64px" className="object-contain p-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
