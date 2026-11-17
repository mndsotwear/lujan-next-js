import type { Metadata } from "next";
import { CatalogTabs } from "@/components/admin/CatalogTabs";
import { CategoryList } from "@/components/admin/CategoryList";
import { fa } from "@/content/fa";
import { requireStaff } from "@/modules/admin/server";
import type { SpecField } from "@/modules/catalog";
import { listCategoriesAdmin } from "@/modules/catalog/server";

export const metadata: Metadata = { title: fa.admin.catalog.categories };

/** دسته‌ها و شِمای فیلترها (FR-ADM-03) */
export default async function CategoriesPage() {
  await requireStaff("products.manage");
  const cats = await listCategoriesAdmin();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{fa.admin.catalog.categories}</h1>
      <CatalogTabs active="categories" />
      <CategoryList
        categories={cats.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          icon: c.icon,
          imageUrl: c.imageUrl,
          sortOrder: c.sortOrder,
          specSchema: (c.specSchema ?? []) as unknown as SpecField[],
          products: c._count.products,
        }))}
      />
    </div>
  );
}
