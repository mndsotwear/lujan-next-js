"use client";
import { useCallback, useState } from "react";
import { fa } from "@/content/fa";
import type { SpecField } from "@/modules/catalog";
import { Icon, type IconName } from "../Icon";
import { CategoryEditor } from "./CategoryEditor";
import { btnGhost, btnPrimary, card } from "./ui";

type Cat = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  imageUrl: string | null;
  sortOrder: number;
  specSchema: SpecField[];
  products: number;
};

export function CategoryList({ categories }: { categories: Cat[] }) {
  const tc = fa.admin.catalog.category;
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const close = useCallback(() => setEditing(null), []);
  return (
    <div className="space-y-3">
      {editing === "new" ? (
        <CategoryEditor onClose={close} />
      ) : (
        <button type="button" onClick={() => setEditing("new")} className={btnPrimary}>
          {tc.new}
        </button>
      )}
      {categories.map((c) =>
        editing === c.id ? (
          <CategoryEditor key={c.id} category={c} onClose={close} />
        ) : (
          <div key={c.id} className={`${card} flex flex-wrap items-center gap-4 p-4`}>
            {c.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- پیش‌نمایش پنل
              <img src={c.imageUrl} alt="" className="size-9 rounded-full object-cover" />
            ) : (
              <Icon name={(c.icon ?? "coffee") as IconName} className="text-copper size-6" />
            )}
            <b>{c.name}</b>
            <span dir="ltr" className="text-steel text-xs">
              /{c.slug}
            </span>
            <span className="text-ink-2 text-sm">{tc.products(c.products)}</span>
            <span className="text-ink-2 text-sm">
              {tc.schema}: {c.specSchema.length.toLocaleString("fa-IR")}
            </span>
            <button
              type="button"
              onClick={() => setEditing(c.id)}
              className={`${btnGhost} ms-auto`}
            >
              {tc.edit}
            </button>
          </div>
        ),
      )}
    </div>
  );
}
