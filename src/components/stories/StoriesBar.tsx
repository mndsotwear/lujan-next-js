"use client";
/** ردیف استوری‌ها بالای اسلایدر صفحه‌ی اصلی (مثل دیجی‌کالا) */
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { fa } from "@/content/fa";
import type { PublicStory } from "@/modules/stories/server";
import { StoryViewer } from "./StoryViewer";

const SEEN_KEY = "lujan-stories-seen";

/** استوری‌های دیده‌شده در همین مرورگر: { id: updatedAt } */
function readSeen(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

export function StoriesBar({ stories }: { stories: PublicStory[] }) {
  const [seen, setSeen] = useState<Record<string, string>>({});
  const [openAt, setOpenAt] = useState<number | null>(null);

  useEffect(() => {
    // فقط پس از بارگذاری در مرورگر (سرور به localStorage دسترسی ندارد)
    const t = setTimeout(() => setSeen(readSeen()), 0);
    return () => clearTimeout(t);
  }, []);

  const markSeen = useCallback((s: PublicStory) => {
    setSeen((prev) => {
      const next = { ...prev, [s.id]: s.updatedAt };
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(next));
      } catch {
        // حافظه‌ی مرورگر در دسترس نیست؛ فقط همین صفحه
      }
      return next;
    });
  }, []);

  if (!stories.length) return null;
  // دیده‌نشده‌ها اول
  const order = stories
    .map((s, i) => ({ s, i, isSeen: seen[s.id] === s.updatedAt }))
    .sort((a, b) => Number(a.isSeen) - Number(b.isSeen));

  return (
    <section aria-label={fa.stories.title}>
      <ul className="flex snap-x [scrollbar-width:none] gap-4 overflow-x-auto py-1 sm:gap-5 [&::-webkit-scrollbar]:hidden">
        {order.map(({ s, i, isSeen }) => (
          <li key={s.id} className="shrink-0 snap-start">
            <button
              type="button"
              onClick={() => setOpenAt(i)}
              aria-label={fa.stories.open(s.title)}
              className="group flex w-[76px] flex-col items-center gap-1.5 text-center sm:w-[84px]"
            >
              <span
                className={`grid size-[72px] place-items-center rounded-full p-[3px] transition-transform group-hover:scale-105 sm:size-20 ${
                  isSeen
                    ? "bg-line"
                    : "bg-[conic-gradient(from_200deg,#1d5fd8,#7a3fd1,#ff4f8b,#ffb347,#1d5fd8)]"
                }`}
              >
                <span className="bg-bg relative block size-full overflow-hidden rounded-full p-[2px]">
                  <span className="relative block size-full overflow-hidden rounded-full">
                    <Image src={s.cover} alt="" fill sizes="80px" className="object-cover" />
                  </span>
                </span>
              </span>
              <span
                className={`line-clamp-2 text-xs leading-snug ${isSeen ? "text-ink-2" : "font-bold"}`}
              >
                {s.title}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {openAt !== null && (
        <StoryViewer
          stories={stories}
          start={openAt}
          onSeen={markSeen}
          onClose={() => setOpenAt(null)}
        />
      )}
    </section>
  );
}
