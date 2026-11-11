"use client";
/**
 * جستجوی زنده با پیشنهاد خودکار (FR-SRCH-01) — الگوی combobox در دسترس‌پذیری:
 * فلش بالا/پایین برای انتخاب، Enter برای رفتن، Escape برای بستن.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { fa } from "@/content/fa";
import { formatNumber } from "@/lib/format";
import type { Suggestions } from "@/modules/search";
import { Icon } from "../Icon";

type Item = { href: string; label: string; sub?: string; icon?: string };

export function SearchBox() {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [data, setData] = useState<Suggestions | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return; // فهرست برای کمتر از ۲ حرف نمایش داده نمی‌شود (showList)
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => r.json() as Promise<Suggestions>)
        .then((d) => {
          setData(d);
          setActive(-1);
        })
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const items: Item[] = [
    ...(data?.categories ?? []).map((c) => ({
      href: `/categories/${c.slug}`,
      label: c.name,
      sub: fa.search.category,
      icon: "grid",
    })),
    ...(data?.products ?? []).map((p) => ({
      href: `/products/${p.slug}`,
      label: p.name,
      sub: `${p.brandName} · ${formatNumber(p.price)} ${fa.units.toman}`,
      icon: p.icon,
    })),
  ];
  const showList = open && q.trim().length >= 2 && data !== null;

  return (
    <form
      ref={box}
      role="search"
      action="/search"
      onSubmit={(e) => {
        const target = items[active];
        if (target) {
          e.preventDefault();
          setOpen(false);
          router.push(target.href);
        }
      }}
      className="border-line bg-surface focus-within:border-copper relative flex min-h-12 items-center gap-2 rounded-full border px-4"
    >
      <Icon name="search" className="text-steel size-5 shrink-0" />
      <label htmlFor="q" className="sr-only">
        {fa.nav.search}
      </label>
      <input
        id="q"
        name="q"
        type="search"
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        placeholder={fa.nav.searchPlaceholder}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, items.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, -1));
          } else if (e.key === "Escape") setOpen(false);
        }}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none"
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="rounded-card border-line bg-surface shadow-sheet absolute inset-x-0 top-full z-40 mt-1 max-h-[70vh] overflow-auto border py-1"
        >
          {items.length === 0 ? (
            <li className="text-steel px-4 py-3 text-sm">{fa.search.noSuggest}</li>
          ) : (
            items.map((it, i) => (
              <li key={it.href} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                <Link
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2 ${i === active ? "bg-surface-2" : "hover:bg-surface-2"}`}
                >
                  <span className="rounded-ctl bg-surface-2 text-steel grid size-9 shrink-0 place-items-center">
                    <Icon name={it.icon ?? "search"} className="size-6" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{it.label}</span>
                    {it.sub && <span className="text-steel block text-xs">{it.sub}</span>}
                  </span>
                </Link>
              </li>
            ))
          )}
          <li className="border-line border-t">
            <button
              type="submit"
              className="text-copper w-full px-4 py-2 text-start text-sm font-medium"
            >
              {fa.search.seeAll(q.trim())}
            </button>
          </li>
        </ul>
      )}
    </form>
  );
}
