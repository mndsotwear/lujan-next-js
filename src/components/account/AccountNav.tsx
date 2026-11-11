"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { fa } from "@/content/fa";
import { logout } from "@/modules/account/actions";

const items = [
  { href: "/account", label: fa.account.nav.dashboard },
  { href: "/account/orders", label: fa.account.nav.orders },
  { href: "/account/addresses", label: fa.account.nav.addresses },
  { href: "/account/wishlist", label: fa.account.nav.wishlist },
  { href: "/account/profile", label: fa.account.nav.profile },
];

export function AccountNav() {
  const path = usePathname();
  return (
    <nav aria-label={fa.nav.account} className="flex gap-1 overflow-x-auto lg:flex-col">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={path === i.href ? "page" : undefined}
          className={`rounded-ctl px-3 py-2 text-sm whitespace-nowrap ${path === i.href ? "bg-surface-2 font-bold" : "text-ink-2 hover:bg-surface-2"}`}
        >
          {i.label}
        </Link>
      ))}
      <form action={logout}>
        <button
          type="submit"
          className="rounded-ctl text-bad hover:bg-surface-2 px-3 py-2 text-start text-sm whitespace-nowrap"
        >
          {fa.account.nav.logout}
        </button>
      </form>
    </nav>
  );
}
