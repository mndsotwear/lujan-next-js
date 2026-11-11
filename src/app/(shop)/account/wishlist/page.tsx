import type { Metadata } from "next";
import { WishlistGrid } from "@/components/catalog/WishlistGrid";
import { fa } from "@/content/fa";
import { requireUser } from "@/modules/account/server";
import { getWishlist } from "@/modules/catalog/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: fa.wishlist.title, robots: { index: false } };

export default async function WishlistPage() {
  const u = await requireUser("/account/wishlist");
  const items = await getWishlist(u.id);
  return (
    <section>
      <h2 className="mb-4 text-xl font-bold">{fa.wishlist.title}</h2>
      {items.length === 0 ? (
        <p className="text-steel">{fa.wishlist.empty}</p>
      ) : (
        <WishlistGrid items={items} />
      )}
    </section>
  );
}
