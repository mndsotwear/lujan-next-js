"use client";

/**
 * منوی دسته‌ها در موبایل (D-067): کشوی تمام‌صفحه با دسته‌های آکاردئونی.
 * از دکمه‌ی منوی سربرگ یا زبانه‌ی «دسته‌ها»ی نوار پایین (رویداد open-categories) باز می‌شود.
 */
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fa } from "@/content/fa";
import type { MegaCategory } from "@/modules/catalog";
import { Icon } from "../Icon";
import { Price } from "../Price";

export const OPEN_CATEGORIES_EVENT = "open-categories";

export function MobileMenu({ categories }: { categories: MegaCategory[] }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(categories[0]?.slug ?? null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_CATEGORIES_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CATEGORIES_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={fa.nav.openMenu}
        aria-expanded={open}
        aria-controls={open ? "mobile-categories" : undefined}
        onClick={() => setOpen(true)}
        className="rounded-ctl border-line grid size-11 place-items-center border lg:hidden"
      >
        <Icon name="menu" className="size-5" />
      </button>

      {/* بیرون از سربرگ تا هر استایل سربرگ (مثل blur یا transform) قاب fixed را محدود نکند */}
      {open &&
        createPortal(
          <div
            id="mobile-categories"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-categories-title"
            className="bg-bg fixed inset-0 z-50 flex flex-col lg:hidden"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) setOpen(false);
            }}
          >
            <div className="border-line flex items-center justify-between border-b px-4 py-3">
              <h2 id="mobile-categories-title" className="text-xl font-black">
                {fa.nav.categories}
              </h2>
              <button
                ref={closeRef}
                type="button"
                aria-label={fa.nav.closeMenu}
                onClick={close}
                className="rounded-ctl border-line grid size-11 place-items-center border"
              >
                <Icon name="close" className="size-5" />
              </button>
            </div>

            <ul className="flex-1 overflow-y-auto px-4 pb-6">
              {categories.map((c) => {
                const isOpen = expanded === c.slug;
                return (
                  <li key={c.slug} className="border-line border-b">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setExpanded(isOpen ? null : c.slug)}
                      className={`flex min-h-14 w-full items-center justify-between gap-3 text-start ${isOpen ? "text-copper font-bold" : ""}`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon name={c.icon} className="size-6 shrink-0 opacity-80" />
                        {c.name}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-steel text-xs font-normal">
                          {fa.nav.itemCount(c.count)}
                        </span>
                        <Icon
                          name="chevronDown"
                          className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      </span>
                    </button>

                    {isOpen && (
                      <div className="flex flex-col gap-4 pb-5">
                        {c.groups.map((g) => (
                          <div key={g.title}>
                            <p className="text-copper mb-1 text-xs">{g.title}</p>
                            <ul className="grid grid-cols-2 gap-x-4">
                              {g.links.map((l) => (
                                <li key={l.href}>
                                  <Link href={l.href} className="flex min-h-11 items-center">
                                    {l.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                        <Link href={c.href} className="text-copper flex min-h-11 items-center">
                          {fa.nav.seeAllOf(c.name)}
                        </Link>
                        {c.featured && (
                          <Link
                            href={c.featured.href}
                            className="rounded-card border-line bg-surface flex items-center gap-4 border p-3"
                          >
                            <span className="rounded-ctl bg-surface-2 text-ink-2 relative grid size-20 shrink-0 place-items-center overflow-hidden">
                              {c.featured.image ? (
                                <Image
                                  src={c.featured.image.url}
                                  alt={c.featured.image.alt}
                                  fill
                                  sizes="80px"
                                  className="object-contain p-1"
                                />
                              ) : (
                                <Icon name={c.featured.icon} className="size-14" />
                              )}
                            </span>
                            <span className="flex min-w-0 flex-col gap-0.5">
                              <span className="text-copper text-xs">{fa.nav.featured}</span>
                              <strong className="text-sm leading-relaxed">{c.featured.name}</strong>
                              <Price price={c.featured.price} oldPrice={c.featured.oldPrice} />
                            </span>
                          </Link>
                        )}
                        {c.brands.length > 0 && (
                          <div>
                            <p className="text-steel mb-2 text-xs">{fa.nav.brands}</p>
                            <div className="flex flex-wrap gap-2">
                              {c.brands.map((b) => (
                                <Link
                                  key={b.href}
                                  href={b.href}
                                  className="rounded-ctl border-line grid min-h-11 place-items-center border px-3 text-sm"
                                >
                                  {b.logoUrl ? (
                                    <Image
                                      src={b.logoUrl}
                                      alt={b.name}
                                      width={80}
                                      height={28}
                                      className="h-7 w-auto object-contain"
                                    />
                                  ) : (
                                    b.name
                                  )}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}
