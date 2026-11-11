"use client";
/** دکمه‌ی قلب علاقه‌مندی (FR-CAT-07) — وضعیت جدا از صفحه گرفته می‌شود تا صفحه‌ی محصول برای همه یکسان بماند */
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { fa } from "@/content/fa";
import { toggleWishlist, wishlistStatus } from "@/modules/catalog/wishlist-actions";
import { Icon } from "../Icon";

export function WishlistButton({ productId, slug }: { productId: string; slug: string }) {
  const t = fa.wishlist;
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let alive = true;
    wishlistStatus(productId)
      .then((s) => alive && setSaved(s.saved))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [productId]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        aria-pressed={saved}
        onClick={() =>
          start(async () => {
            const r = await toggleWishlist(productId);
            if (!r.loggedIn) {
              router.push(`/login?next=${encodeURIComponent(`/products/${slug}`)}`);
              return;
            }
            setSaved(r.saved);
            setMsg(r.full ? t.full : r.saved ? t.added : t.removed);
          })
        }
        className={`rounded-ctl border-line hover:border-ink flex min-h-11 items-center gap-2 border-[1.5px] px-3 text-sm ${saved ? "text-copper border-copper" : ""}`}
      >
        <Icon name="heart" className={`size-5 ${saved ? "[&_path]:fill-current" : ""}`} />
        {saved ? t.saved : t.save}
      </button>
      <span role="status" className="text-steel text-xs">
        {msg ?? ""}
      </span>
    </div>
  );
}
