"use client";
/** بنرهای صفحه‌ی اصلی (D-048) — ورق با دکمه، بدون چرخش خودکار (WCAG 2.2.2) */
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { fa } from "@/content/fa";

export type BannerView = {
  id: string;
  title: string;
  subtitle: string | null;
  link: string | null;
  alt: string;
  imageDesktop: string;
  imageMobile: string | null;
};

export function BannerCarousel({ banners }: { banners: BannerView[] }) {
  const [i, setI] = useState(0);
  const b = banners[i];
  if (!b) return null;
  const n = banners.length;
  const body = (
    <div className="rounded-sheet bg-surface-2 relative aspect-square overflow-hidden sm:aspect-[16/6]">
      <picture className="absolute inset-0">
        {b.imageMobile && <source media="(max-width: 639px)" srcSet={b.imageMobile} />}
        <Image
          src={b.imageDesktop}
          alt={b.alt}
          fill
          priority
          sizes="(max-width: 1120px) 100vw, 1120px"
          className="object-cover"
        />
      </picture>
      <div className="from-ink/80 absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent p-5 text-white sm:p-8">
        <h2 className="text-xl font-black sm:text-3xl">{b.title}</h2>
        {b.subtitle && (
          <p className="mt-1 max-w-[50ch] text-sm opacity-90 sm:text-base">{b.subtitle}</p>
        )}
      </div>
    </div>
  );
  return (
    <section aria-roledescription="carousel" aria-label={fa.banners.region} className="pt-6">
      <div aria-live="polite">
        {b.link ? (
          <Link href={b.link} className="block">
            {body}
          </Link>
        ) : (
          body
        )}
      </div>
      {n > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => setI((i - 1 + n) % n)}
            aria-label={fa.banners.prev}
            className="rounded-ctl border-line min-h-10 min-w-10 border-[1.5px] px-3"
          >
            ‹
          </button>
          <span className="text-ink-2">{fa.banners.of(i + 1, n)}</span>
          <button
            type="button"
            onClick={() => setI((i + 1) % n)}
            aria-label={fa.banners.next}
            className="rounded-ctl border-line min-h-10 min-w-10 border-[1.5px] px-3"
          >
            ›
          </button>
        </div>
      )}
    </section>
  );
}
