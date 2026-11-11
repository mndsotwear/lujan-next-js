"use client";

/**
 * مگامنوی دسته‌ها در دسکتاپ (D-067).
 * - با ماوس: فقط تا وقتی ماوس روی دکمه یا خود منوست باز می‌ماند و با بیرون رفتن، فوراً بسته می‌شود؛ کلیک ماوس آن را نمی‌بندد.
 *   یک «پل» نامرئی زیر دکمه، فاصله‌ی دکمه تا منو را می‌پوشاند تا رفتن ماوس از دکمه به منو آن را نبندد.
 *   رفتن ماوس روی هر دسته، محتوای وسط را عوض می‌کند.
 * - باز و بسته شدن: محو و لغزش کوتاه در ۰٫۲۵ ثانیه؛ زمینه‌ی نیمه‌شفاف و مات تا صفحه‌ی پشت کمی دیده شود.
 * - با صفحه‌کلید یا لمس: کلیک باز و بسته می‌کند؛ Escape، کلیک بیرون یا رفتن به صفحه‌ای دیگر می‌بندد.
 * - پیوندها همیشه در HTML هستند (فقط پنهان) تا موتور جستجو همه‌ی دسته‌ها و فیلترها را ببیند.
 */
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { fa } from "@/content/fa";
import type { MegaCategory } from "@/modules/catalog";
import { Icon } from "../Icon";
import { Price } from "../Price";

const OPEN_DELAY = 80;

export function MegaMenu({ categories }: { categories: MegaCategory[] }) {
  const [open, setOpen] = useState(false);
  const [activeSlug, setActiveSlug] = useState(categories[0]?.slug ?? "");
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointer = useRef("");

  const later = (fn: () => void, ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(fn, ms);
  };
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  useEffect(() => () => cancel(), []);

  if (!categories.length) return null;
  const active = categories.find((c) => c.slug === activeSlug) ?? categories[0]!;

  return (
    <div
      ref={rootRef}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") {
          cancel();
          setOpen(false);
        }
      }}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse" && open) cancel();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          buttonRef.current?.focus();
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="mega-menu"
        onPointerDown={(e) => {
          pointer.current = e.pointerType;
        }}
        onClick={(e) => {
          cancel();
          // کلیک ماوس (detail > 0) فقط باز نگه می‌دارد؛ بستن با بیرون رفتن ماوس است
          if (pointer.current === "mouse" && e.detail > 0) setOpen(true);
          else setOpen((o) => !o);
          pointer.current = "";
        }}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") later(() => setOpen(true), OPEN_DELAY);
        }}
        className={`rounded-ctl relative flex min-h-11 items-center gap-2 border px-4 font-bold transition-colors ${
          open
            ? "border-copper bg-copper text-copper-ink after:absolute after:inset-x-0 after:top-full after:h-5 after:content-['']"
            : "border-line bg-surface hover:border-copper"
        }`}
      >
        <Icon name="menu" className="size-5" />
        {fa.nav.allCategories}
      </button>

      <div
        id="mega-menu"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setOpen(false);
        }}
        // باز و بسته شدن نرم (۰٫۲۵ ثانیه: محو + لغزش کوتاه از بالا) و زمینه‌ی نیمه‌شفاف مات؛
        // سربرگ عمداً blur ندارد: blur والد، blur این منو را از صفحه‌ی پشت جدا می‌کرد (متن پشت تیز و خوانا می‌ماند)؛
        // در حالت بسته invisible است: نه دیده می‌شود، نه با Tab یا ماوس در دسترس است، ولی پیوندها در HTML می‌مانند
        className={`border-line bg-bg/70 shadow-sheet supports-[not(backdrop-filter:blur(1px))]:bg-bg absolute inset-x-0 top-full z-40 border-y backdrop-blur-lg backdrop-saturate-150 transition-[opacity,translate,visibility] duration-[250ms] ease-out ${
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"
        }`}
      >
        <div className="mx-auto flex max-w-[1240px] gap-8 px-4 py-7">
          <ul className="flex w-60 shrink-0 flex-col gap-0.5" aria-label={fa.nav.categories}>
            {categories.map((c) => {
              const on = c.slug === active.slug;
              return (
                <li key={c.slug}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onPointerEnter={() => setActiveSlug(c.slug)}
                    onFocus={() => setActiveSlug(c.slug)}
                    onClick={() => setActiveSlug(c.slug)}
                    className={`rounded-ctl flex min-h-11 w-full items-center justify-between gap-3 px-3 text-start ${
                      on ? "bg-surface-2 text-copper font-bold" : "hover:bg-surface"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon name={c.icon} className="size-6 shrink-0 opacity-80" />
                      {c.name}
                    </span>
                    <span className={`text-xs ${on ? "text-copper" : "text-steel"}`}>
                      {c.count.toLocaleString("fa-IR")}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {categories.map((c) => (
            <div key={c.slug} hidden={c.slug !== active.slug} className="flex min-w-0 flex-1 gap-8">
              <div className="flex min-w-0 flex-1 flex-col gap-6">
                <div className="border-line flex items-baseline justify-between gap-4 border-b pb-3">
                  <p className="text-2xl font-black">{c.name}</p>
                  <Link href={c.href} className="text-copper text-sm hover:underline">
                    {fa.nav.seeAllOf(c.name)}
                  </Link>
                </div>
                <div className="grid grid-cols-3 gap-7">
                  {c.groups.map((g) => (
                    <div key={g.title} className="flex flex-col gap-2">
                      <p className="text-copper mb-1 text-[13px] font-medium">{g.title}</p>
                      <ul className="flex flex-col gap-2">
                        {g.links.map((l) => (
                          <li key={l.href}>
                            <Link href={l.href} className="hover:text-copper text-[15px]">
                              {l.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                {c.brands.length > 0 && (
                  <div className="border-line mt-auto flex flex-wrap items-center gap-2.5 border-t pt-4">
                    <span className="text-steel me-2 text-[13px]">{fa.nav.brandsOf}</span>
                    {c.brands.map((b) => (
                      <Link
                        key={b.href}
                        href={b.href}
                        className="rounded-ctl border-line hover:border-copper grid h-12 min-w-28 place-items-center border px-3 text-sm"
                      >
                        {b.logoUrl ? (
                          <Image
                            src={b.logoUrl}
                            alt={b.name}
                            width={96}
                            height={32}
                            className="h-8 w-auto object-contain"
                          />
                        ) : (
                          b.name
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {c.featured && (
                <Link
                  href={c.featured.href}
                  className="rounded-sheet border-line bg-surface hover:border-copper relative flex w-72 shrink-0 flex-col gap-1.5 overflow-hidden border p-5"
                >
                  <span className="text-ink-2 bg-surface-2 rounded-card relative mb-3 grid aspect-[4/3] place-items-center overflow-hidden">
                    {c.featured.image ? (
                      <Image
                        src={c.featured.image.url}
                        alt={c.featured.image.alt}
                        fill
                        sizes="288px"
                        className="object-contain p-3"
                      />
                    ) : (
                      <Icon name={c.featured.icon} className="h-3/4 w-auto" />
                    )}
                  </span>
                  <span className="text-copper text-xs">{fa.nav.featured}</span>
                  <strong className="leading-relaxed">{c.featured.name}</strong>
                  <Price price={c.featured.price} oldPrice={c.featured.oldPrice} />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
