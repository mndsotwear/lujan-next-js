"use client";
import { useState } from "react";
import { fa } from "@/content/fa";
import { useCart } from "./CartProvider";

/** افزودن به سبد (FR-CART-01، FR-REC-05) — پس از افزودن پیام کوچک «به سبد افزوده شد» نمایش داده می‌شود. */
export function AddToCartButton({
  variantId,
  name,
  qty = 1,
  variant = "primary",
  className = "",
  openDrawer = true,
}: {
  variantId: string;
  name: string;
  qty?: number;
  variant?: "primary" | "small";
  className?: string;
  openDrawer?: boolean;
}) {
  const { add } = useCart();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const base =
    variant === "small"
      ? "min-h-9 rounded-ctl border-[1.5px] border-copper px-3 text-sm font-bold text-copper aria-pressed:bg-copper aria-pressed:text-copper-ink"
      : "min-h-12 w-full rounded-full bg-copper px-5 font-bold text-copper-ink transition-transform active:scale-[.97] disabled:opacity-60";
  return (
    <button
      type="button"
      disabled={busy}
      aria-pressed={variant === "small" ? done : undefined}
      onClick={async () => {
        setBusy(true);
        const ok = await add(variantId, qty, { openDrawer, name });
        setBusy(false);
        if (ok && variant === "small") setDone(true);
      }}
      className={`${base} ${className}`}
    >
      {busy
        ? fa.cart.adding
        : done
          ? fa.cart.addedShort
          : variant === "small"
            ? fa.cart.addOne
            : fa.cart.add}
    </button>
  );
}
