"use client";
/**
 * اخیراً دیده‌شده‌ها (FR-CAT-07، D-061) — فقط در همین مرورگر (localStorage)؛ بدون ثبت در سرور.
 * با currentId محصول فعلی ثبت می‌شود و خودش در فهرست نمی‌آید.
 */
import { useEffect, useState } from "react";
import { fa } from "@/content/fa";
import type { ProductSummary } from "@/modules/catalog";
import { recentSummaries } from "@/modules/catalog/wishlist-actions";
import { ProductCard } from "../ProductCard";

const KEY = "recently-viewed";
const MAX = 12;

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function RecentlyViewed({ currentId, limit = 4 }: { currentId?: string; limit?: number }) {
  const [items, setItems] = useState<ProductSummary[]>([]);

  useEffect(() => {
    let ids = read();
    if (currentId) {
      ids = [currentId, ...ids.filter((x) => x !== currentId)].slice(0, MAX);
      try {
        localStorage.setItem(KEY, JSON.stringify(ids));
      } catch {
        // حالت خصوصی یا فضای پر: فقط نمایش نمی‌دهیم
      }
    }
    const show = ids.filter((x) => x !== currentId).slice(0, limit);
    if (!show.length) return;
    let alive = true;
    recentSummaries(show)
      .then((r) => alive && setItems(r))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [currentId, limit]);

  if (!items.length) return null;
  return (
    <section className="pt-12" aria-labelledby="recent-title">
      <h2 id="recent-title" className="mb-4 text-xl font-bold">
        {fa.wishlist.recent}
      </h2>
      <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:gap-2">
        {items.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}
