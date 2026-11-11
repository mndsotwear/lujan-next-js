"use client";
/**
 * اسلایدر اصلی صفحه‌ی اول: چرخش خودکار با دکمه‌ی توقف (WCAG 2.2.2)، نقطه‌ها و فلش‌ها.
 * اسلاید یا گرادیان + آیکون است، یا تصویر بنر که مدیر در پنل می‌گذارد.
 */
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "../Icon";

export type Slide = {
  id: string;
  title: string;
  subtitle?: string | null;
  href: string;
  cta: string;
  /** کلاس‌های گرادیان Tailwind برای اسلاید بدون تصویر */
  bg?: string;
  icon?: string;
  image?: string | null;
  alt?: string;
};

export function HeroSlider({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hover, setHover] = useState(false);
  const n = slides.length;

  useEffect(() => {
    if (!playing || hover || n < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), 6000);
    return () => clearInterval(t);
  }, [playing, hover, n]);

  if (n === 0) return null;
  const go = (d: number) => setI((x) => (x + d + n) % n);
  const btn =
    "absolute top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-card hover:bg-white max-sm:hidden";
  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="پیشنهادهای ویژه"
      className="rounded-sheet relative isolate overflow-hidden"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(${i * 100}%)` }}
      >
        {slides.map((s, idx) => (
          <div
            key={s.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${idx + 1} از ${n}`}
            aria-hidden={idx !== i}
            className={`relative min-h-[260px] w-full shrink-0 sm:min-h-[340px] lg:min-h-[400px] ${s.bg ?? "from-copper bg-gradient-to-l to-[#0b2a6b]"}`}
          >
            {s.image && (
              <Image
                src={s.image}
                alt={s.alt ?? ""}
                fill
                priority={idx === 0}
                sizes="(max-width: 1120px) 100vw, 760px"
                className="object-cover"
              />
            )}
            {!s.image && s.icon && (
              <Icon
                name={s.icon}
                aria-hidden
                className="absolute start-6 -bottom-6 size-[220px] text-white/20 sm:size-[300px] lg:size-[360px]"
              />
            )}
            <div className="relative z-[1] flex h-full min-h-[inherit] max-w-[34rem] flex-col justify-center gap-4 p-7 text-white sm:p-12 lg:ps-16">
              <h2 className="text-[length:clamp(1.6rem,3.6vw,2.8rem)] leading-[1.3] font-black drop-shadow">
                {s.title}
              </h2>
              {s.subtitle && (
                <p className="max-w-[42ch] text-sm opacity-95 sm:text-base">{s.subtitle}</p>
              )}
              <Link
                href={s.href}
                tabIndex={idx === i ? 0 : -1}
                className="text-ink shadow-card mt-1 inline-grid min-h-12 w-fit place-items-center rounded-full bg-white px-7 font-bold transition-transform hover:scale-[1.03]"
              >
                {s.cta}
              </Link>
            </div>
          </div>
        ))}
      </div>
      {n > 1 && (
        <>
          <button
            type="button"
            aria-label="اسلاید قبلی"
            onClick={() => go(-1)}
            className={`${btn} start-3`}
          >
            <Icon name="chevron" className="size-5 rotate-180" />
          </button>
          <button
            type="button"
            aria-label="اسلاید بعدی"
            onClick={() => go(1)}
            className={`${btn} end-3`}
          >
            <Icon name="chevron" className="size-5" />
          </button>
          <div className="absolute inset-x-0 bottom-4 z-10 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "توقف چرخش خودکار" : "شروع چرخش خودکار"}
              className="grid size-7 place-items-center rounded-full bg-white/85 text-xs font-bold"
            >
              {playing ? "❚❚" : "▶"}
            </button>
            <div className="flex gap-1.5 rounded-full bg-black/25 px-2.5 py-2 backdrop-blur">
              {slides.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`رفتن به اسلاید ${idx + 1}`}
                  aria-current={idx === i}
                  onClick={() => setI(idx)}
                  className={`h-2 rounded-full transition-all ${idx === i ? "w-6 bg-white" : "w-2 bg-white/60"}`}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
