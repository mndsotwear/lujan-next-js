"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { fa } from "@/content/fa";
import { CartCountBadge } from "../cart/CartButton";
import { Icon } from "../Icon";
import { OPEN_CATEGORIES_EVENT } from "./MobileMenu";

const tabs = [
  { href: "/", icon: "home", label: fa.nav.home, match: (p: string) => p === "/" },
  {
    href: "/categories/instant-coffee",
    icon: "grid",
    label: fa.nav.categories,
    match: (p: string) => p.startsWith("/categories"),
  },
  {
    href: "/search",
    icon: "search",
    label: fa.nav.search,
    match: (p: string) => p.startsWith("/search"),
  },
  { href: "/cart", icon: "cart", label: fa.nav.cart, match: (p: string) => p.startsWith("/cart") },
  {
    href: "/account",
    icon: "user",
    label: fa.nav.account,
    match: (p: string) => p.startsWith("/account"),
  },
];

/** نوار پایین موبایل (بخش ۱۳-۱) — در دسکتاپ پنهان است. */
export function MobileTabBar() {
  const path = usePathname();
  return (
    <nav
      aria-label={fa.nav.home}
      className="border-line bg-bg/95 supports-[backdrop-filter]:bg-bg/85 fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {tabs.map((t) => {
        const active = t.match(path);
        return (
          <Link
            key={t.href}
            href={t.href}
            onClick={
              t.icon === "grid"
                ? (e) => {
                    e.preventDefault();
                    window.dispatchEvent(new Event(OPEN_CATEGORIES_EVENT));
                  }
                : undefined
            }
            aria-current={active ? "page" : undefined}
            className={`relative flex flex-col items-center gap-0.5 pt-2 pb-3 text-[11px] ${active ? "text-copper before:bg-copper font-bold before:absolute before:inset-x-[30%] before:top-0 before:h-0.5" : "text-steel"}`}
          >
            {t.href === "/cart" && <CartCountBadge />}
            <Icon name={t.icon} className="size-[22px]" />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
