"use client";
/** پیام کوچک «به سبد افزوده شد» پس از افزودن کالا (به‌جای باز شدن پنل سبد) */
import Link from "next/link";
import { useEffect, useState } from "react";
import { fa } from "@/content/fa";
import { Icon } from "../Icon";
import { useCart } from "./CartProvider";

export function CartToast() {
  const { toast, open } = useCart();
  // شناسه‌ی پیامی که بسته شده؛ پیام تازه شناسه‌ی تازه دارد و دوباره نمایش داده می‌شود
  const [hiddenId, setHiddenId] = useState<number | null>(null);
  const shown = toast && toast.id !== hiddenId ? toast : null;

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setHiddenId(toast.id), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[88px] z-[60] flex justify-center px-4 lg:bottom-6"
    >
      {shown && !open && (
        <div
          className={`rounded-card pointer-events-auto flex max-w-md items-center gap-3 px-4 py-3 text-sm text-white shadow-[0_14px_40px_-14px_rgb(0_0_0/0.5)] ${shown.ok ? "bg-[#0f1b2d]" : "bg-[#b3362b]"}`}
        >
          <Icon name={shown.ok ? "check" : "close"} className="size-5 shrink-0" />
          <span className="min-w-0 flex-1">{shown.text}</span>
          {shown.ok && (
            <Link
              href="/cart"
              onClick={() => setHiddenId(shown.id)}
              className="shrink-0 font-bold text-[#8fb6ff] underline-offset-4 hover:underline"
            >
              {fa.cart.viewCartShort}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
