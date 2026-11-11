"use client";
/** رویداد خرید یک‌بار برای هر سفارش (D-054) */
import { useEffect } from "react";
import { trackOnce } from "@/lib/analytics";

export function TrackPurchase({ number, revenue }: { number: number; revenue: number }) {
  useEffect(() => {
    trackOnce(`purchase:${number}`, "purchase", { order: number, revenue });
  }, [number, revenue]);
  return null;
}
