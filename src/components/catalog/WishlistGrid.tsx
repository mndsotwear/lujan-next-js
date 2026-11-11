"use client";
/** فهرست علاقه‌مندی‌ها با دکمه‌ی برداشتن */
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { fa } from "@/content/fa";
import type { ProductSummary } from "@/modules/catalog";
import { toggleWishlist } from "@/modules/catalog/wishlist-actions";
import { ProductCard } from "../ProductCard";

export function WishlistGrid({ items }: { items: ProductSummary[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-2 max-sm:gap-2">
      {items.map((p) => (
        <div key={p.id} className="space-y-2">
          <ProductCard p={p} />
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await toggleWishlist(p.id);
                router.refresh();
              })
            }
            className="text-steel hover:text-bad text-sm underline-offset-4 hover:underline"
          >
            {fa.wishlist.remove}
          </button>
        </div>
      ))}
    </div>
  );
}
