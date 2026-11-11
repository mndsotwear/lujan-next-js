"use client";
/** منوی پنل — فقط بخش‌هایی که نقش اجازه دارد؛ بخش‌های بعدی M1.9 با برچسب «به‌زودی» */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { fa } from "@/content/fa";

export type NavItem = { href: string; label: string; ready: boolean };

export function AdminNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav aria-label={fa.admin.title} className="flex gap-1 overflow-x-auto lg:flex-col">
      {items.map((i) => {
        const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
        return i.ready ? (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-ctl px-3 py-2 text-sm whitespace-nowrap ${active ? "bg-copper-soft text-copper font-bold shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]" : "text-ink-2 hover:bg-surface-2 transition-colors"}`}
          >
            {i.label}
          </Link>
        ) : (
          <span
            key={i.href}
            aria-disabled
            className="text-steel flex items-center justify-between gap-2 px-3 py-2 text-sm whitespace-nowrap"
          >
            {i.label}
            <small className="text-[11px]">{fa.admin.soon}</small>
          </span>
        );
      })}
    </nav>
  );
}
