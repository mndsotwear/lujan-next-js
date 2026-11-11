"use client";
/**
 * کروسل افقی محصولات (scroll-snap): با کشیدن در موبایل و دکمه‌های قبلی/بعدی در دسکتاپ.
 * جهت راست‌به‌چپ را خودش تشخیص می‌دهد؛ «بعدی» همیشه به سمت انتهای فهرست می‌رود.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";

export function Carousel({
  children,
  label,
  itemClass = "w-[210px] sm:w-[236px]",
}: {
  children: React.ReactNode[];
  label: string;
  itemClass?: string;
}) {
  const track = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const pos = Math.abs(el.scrollLeft);
    setEdge({ start: pos < 4, end: pos > max - 4 });
  }, []);

  useEffect(() => {
    update();
    const el = track.current;
    el?.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const go = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollBy({ left: dir * (rtl ? -1 : 1) * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const arrow =
    "absolute top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface text-ink shadow-card transition-opacity hover:text-copper max-md:hidden";
  return (
    <div className="relative" role="region" aria-roledescription="carousel" aria-label={label}>
      <ul
        ref={track}
        className="flex snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto scroll-smooth px-1 pt-1 pb-4 [&::-webkit-scrollbar]:hidden"
      >
        {children.map((c, i) => (
          <li key={i} className={`shrink-0 snap-start ${itemClass}`}>
            {c}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="قبلی"
        disabled={edge.start}
        className={`${arrow} start-0 -translate-x-1/3 rtl:translate-x-1/3 ${edge.start ? "pointer-events-none opacity-0" : ""}`}
      >
        <Icon name="chevron" className="size-5 rotate-180" />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="بعدی"
        disabled={edge.end}
        className={`${arrow} end-0 translate-x-1/3 rtl:-translate-x-1/3 ${edge.end ? "pointer-events-none opacity-0" : ""}`}
      >
        <Icon name="chevron" className="size-5" />
      </button>
    </div>
  );
}
