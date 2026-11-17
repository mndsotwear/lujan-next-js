"use client";
/**
 * نمایش تمام‌صفحه‌ی استوری: نوار پیشرفت، رفتن خودکار، ضربه چپ/راست، نگه داشتن = مکث،
 * کشیدن به پایین یا Esc = بستن. راست‌به‌چپ: ضربه‌ی سمت چپ = بعدی.
 */
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { fa } from "@/content/fa";
import type { PublicStory } from "@/modules/stories/server";
import { STORY_IMAGE_MS, STORY_VIDEO_MAX_MS } from "@/modules/stories/rules";
import { Icon } from "../Icon";

export function StoryViewer({
  stories,
  start,
  onSeen,
  onClose,
}: {
  stories: PublicStory[];
  start: number;
  onSeen: (s: PublicStory) => void;
  onClose: () => void;
}) {
  const [si, setSi] = useState(start);
  const [xi, setXi] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const press = useRef<{ t: number; x: number; y: number } | null>(null);
  const [dragY, setDragY] = useState(0);

  const story = stories[si]!;
  const slide = story.slides[xi]!;

  const go = useCallback(
    (dir: 1 | -1) => {
      setProgress(0);
      if (dir === 1) {
        if (xi < story.slides.length - 1) return setXi(xi + 1);
        if (si < stories.length - 1) {
          setSi(si + 1);
          return setXi(0);
        }
        return onClose();
      }
      if (xi > 0) return setXi(xi - 1);
      if (si > 0) {
        setSi(si - 1);
        setXi(0);
      }
    },
    [xi, si, story.slides.length, stories.length, onClose],
  );

  // دیده‌شده و قفل اسکرول صفحه
  useEffect(() => onSeen(story), [story, onSeen]);
  useEffect(() => {
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // صفحه‌کلید
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(1);
      else if (e.key === "ArrowRight") go(-1);
      else if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  // زمان‌سنج عکس (پیشرفت در ref تا تابع به‌روزرسانی state بدون اثر جانبی بماند)
  const elapsed = useRef(0);
  useEffect(() => {
    elapsed.current = 0;
  }, [slide]);
  useEffect(() => {
    if (slide.kind !== "image" || paused) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      elapsed.current += now - last;
      last = now;
      const p = elapsed.current / STORY_IMAGE_MS;
      setProgress(Math.min(1, p));
      if (p >= 1) go(1);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [slide, paused, go]);

  // پخش و مکث ویدیو
  useEffect(() => {
    const v = videoRef.current;
    if (!v || slide.kind !== "video") return;
    if (paused) v.pause();
    else void v.play().catch(() => {});
  }, [slide, paused]);

  const onVideoTime = () => {
    const v = videoRef.current;
    if (!v) return;
    const total = Math.min(v.duration || STORY_VIDEO_MAX_MS / 1000, STORY_VIDEO_MAX_MS / 1000);
    const p = v.currentTime / total;
    setProgress(Math.min(1, p));
    if (p >= 1) go(1);
  };

  // لمس و موس: ضربه‌ی کوتاه = جابه‌جایی، نگه داشتن = مکث، کشیدن به پایین = بستن
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("a,button")) return;
    press.current = { t: Date.now(), x: e.clientX, y: e.clientY };
    setPaused(true);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!press.current) return;
    setDragY(Math.max(0, e.clientY - press.current.y));
  };
  const onUp = (e: React.PointerEvent) => {
    const p = press.current;
    press.current = null;
    setPaused(false);
    if (!p) return;
    const dy = e.clientY - p.y;
    setDragY(0);
    if (dy > 90) return onClose();
    if (Date.now() - p.t > 250 || Math.abs(dy) > 12) return;
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    // راست‌به‌چپ: یک‌سوم راست = قبلی، بقیه = بعدی
    go(e.clientX - box.left > (box.width * 2) / 3 ? -1 : 1);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={story.title}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm"
    >
      <button
        type="button"
        aria-label={fa.stories.close}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        tabIndex={-1}
      />
      {/* قبلی و بعدی دسکتاپ */}
      <button
        type="button"
        onClick={() => go(-1)}
        disabled={si === 0 && xi === 0}
        aria-label={fa.stories.prev}
        className="absolute top-1/2 right-[calc(50%-min(50vw,28dvh)-64px)] z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black disabled:opacity-30 lg:grid"
      >
        <Icon name="chevron" className="size-5 rotate-180" />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label={fa.stories.next}
        className="absolute top-1/2 left-[calc(50%-min(50vw,28dvh)-64px)] z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black lg:grid"
      >
        <Icon name="chevron" className="size-5" />
      </button>

      <div
        className="relative h-dvh w-full touch-none overflow-hidden bg-black select-none sm:h-[min(100dvh,860px)] sm:w-[min(100vw,calc(min(100dvh,860px)*0.5625))] sm:rounded-[18px]"
        style={{
          transform: dragY ? `translateY(${dragY}px) scale(${1 - dragY / 2000})` : undefined,
          opacity: dragY ? 1 - dragY / 600 : undefined,
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => {
          press.current = null;
          setPaused(false);
          setDragY(0);
        }}
      >
        {slide.kind === "video" ? (
          <video
            key={slide.id}
            ref={videoRef}
            src={slide.url}
            className="absolute inset-0 size-full object-contain"
            playsInline
            autoPlay
            muted={muted}
            preload="auto"
            onTimeUpdate={onVideoTime}
            onEnded={() => go(1)}
          />
        ) : (
          <Image
            key={slide.id}
            src={slide.url}
            alt={story.title}
            fill
            sizes="(min-width: 640px) 480px, 100vw"
            priority
            className="object-contain"
          />
        )}

        {/* بالا: نوار پیشرفت، عنوان و دکمه‌ها */}
        <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent px-3 pt-3 pb-8">
          <div className="flex gap-1" dir="rtl">
            {story.slides.map((x, i) => (
              <span key={x.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/35">
                <span
                  className="block h-full rounded-full bg-white"
                  style={{ width: `${i < xi ? 100 : i === xi ? progress * 100 : 0}%` }}
                />
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-white">
            <span className="relative size-8 shrink-0 overflow-hidden rounded-full ring-2 ring-white/70">
              <Image src={story.cover} alt="" fill sizes="32px" className="object-cover" />
            </span>
            <b className="min-w-0 flex-1 truncate text-sm">{story.title}</b>
            {slide.kind === "video" && (
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? fa.stories.unmute : fa.stories.mute}
                className="grid size-10 place-items-center rounded-full text-xs font-bold hover:bg-white/15"
              >
                {muted ? "🔇" : "🔊"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? fa.stories.play : fa.stories.pause}
              className="grid size-10 place-items-center rounded-full text-lg leading-none hover:bg-white/15"
            >
              {paused ? "▶" : "❚❚"}
            </button>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={fa.stories.close}
              className="grid size-10 place-items-center rounded-full hover:bg-white/15"
            >
              <Icon name="close" className="size-6" />
            </button>
          </div>
        </div>

        {/* پایین: دکمه‌ی لینک */}
        {slide.ctaLink && (
          <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/60 to-transparent px-4 pt-10 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <Link
              href={slide.ctaLink}
              onClick={onClose}
              className="text-ink inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold shadow-lg"
            >
              {slide.ctaLabel ?? fa.stories.defaultCta}
              <Icon name="chevron" className="size-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
