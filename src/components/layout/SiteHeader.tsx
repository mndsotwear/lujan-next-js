import Link from "next/link";
import { fa } from "@/content/fa";
import { getCurrentUser } from "@/modules/account/server";
import { getMegaMenu, wishlistCount } from "@/modules/catalog/server";
import { Icon } from "../Icon";
import { SearchBox } from "./SearchBox";
import { CartButton } from "../cart/CartButton";
import { MegaMenu } from "./MegaMenu";
import { MobileMenu } from "./MobileMenu";

/** سربرگ سه‌طبقه‌ی لوجان: نوار اعلان رنگی، ردیف لوگو/جستجو/حساب/سبد، و نوار دسته‌ها با مگامنو */
export async function SiteHeader() {
  const [menu, user] = await Promise.all([getMegaMenu(), getCurrentUser()]);
  const wished = user ? await wishlistCount(user.id).catch(() => 0) : 0;
  return (
    <header className="bg-surface shadow-card sticky top-0 z-30">
      <div className="bg-copper text-copper-ink max-lg:hidden">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-6 px-4 py-1.5 text-[13px]">
          <span className="font-medium">{fa.nav.topBar}</span>
          <nav aria-label={fa.nav.store} className="flex gap-6 opacity-95">
            <Link href="/track" className="hover:underline">
              {fa.nav.track}
            </Link>
            <Link href="/blog" className="hover:underline">
              {fa.nav.blog}
            </Link>
            <Link href="/contact" className="hover:underline">
              {fa.nav.contact}
            </Link>
          </nav>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1240px] grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-3 px-4 py-3 lg:grid-cols-[auto_1fr_auto] lg:gap-x-8 lg:py-4">
        <MobileMenu categories={menu} />
        <Link
          href="/"
          className="flex items-center gap-2 whitespace-nowrap max-lg:justify-self-center"
          aria-label={fa.site.name}
        >
          <span className="bg-copper text-copper-ink shadow-card grid size-10 place-items-center rounded-2xl text-xl font-black">
            ل
          </span>
          <span className="text-2xl font-black tracking-tight">{fa.site.name}</span>
        </Link>
        <div className="max-lg:col-span-3 max-lg:row-start-2 lg:col-start-2 lg:row-start-1">
          <SearchBox />
        </div>
        <div className="flex items-center gap-2 lg:col-start-3 lg:row-start-1">
          <Link
            href={user ? "/account/wishlist" : "/login?next=%2Faccount%2Fwishlist"}
            className="bg-surface-2 hover:text-copper relative grid size-11 place-items-center rounded-full max-lg:hidden"
            title={fa.nav.wishlist}
          >
            <Icon name="heart" className="size-5" label={fa.nav.wishlist} />
            {wished > 0 && (
              <span className="bg-bad absolute -top-1 -left-1 grid min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold text-white">
                {wished.toLocaleString("fa-IR")}
              </span>
            )}
          </Link>
          <Link
            href={user ? "/account" : "/login"}
            className="bg-surface-2 hover:text-copper flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap max-lg:hidden"
          >
            <Icon name="user" className="size-5" />
            <span className="max-w-40 truncate">
              {user ? (user.name ?? fa.nav.account) : fa.nav.login}
            </span>
          </Link>
          <CartButton />
        </div>
      </div>

      <nav
        aria-label={fa.nav.categories}
        className="border-line mx-auto flex max-w-[1240px] items-center gap-x-6 border-t px-4 py-2 text-[15px] max-lg:hidden"
      >
        <MegaMenu categories={menu} />
        {menu.map((c) => (
          <Link
            key={c.slug}
            href={c.href}
            className="hover:text-copper flex items-center gap-1.5 font-medium whitespace-nowrap"
          >
            <Icon name={c.icon} className="text-copper size-5" />
            {c.name}
          </Link>
        ))}
        <span className="bg-copper-soft text-copper ms-auto rounded-full px-3 py-1 text-sm font-bold whitespace-nowrap">
          {fa.nav.wholesale}
        </span>
      </nav>
    </header>
  );
}
