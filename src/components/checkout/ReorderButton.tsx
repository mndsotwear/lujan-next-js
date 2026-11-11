"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fa } from "@/content/fa";
import { reorder } from "@/modules/checkout/actions";

/** سفارش مجدد (FR-ACC-03) */
export function ReorderButton({ number }: { number: number }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        onClick={async () => {
          const r = await reorder(number);
          setMsg(r.ok ? fa.checkout.order.reordered(r.added) : fa.cart.errors.outOfStock);
          router.refresh();
        }}
        className="rounded-ctl border-ink min-h-11 border-[1.5px] px-4 text-sm font-bold"
      >
        {fa.checkout.order.reorder}
      </button>
      {msg && (
        <p role="status" className="text-ink-2 mt-1 text-xs">
          {msg}
        </p>
      )}
    </div>
  );
}
