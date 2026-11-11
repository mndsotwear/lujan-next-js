import type { Metadata } from "next";
import { BrandForm } from "@/components/admin/BrandForm";
import { CatalogTabs } from "@/components/admin/CatalogTabs";
import { fa } from "@/content/fa";
import { requireStaff } from "@/modules/admin/server";
import { listBrandsAdmin } from "@/modules/catalog/server";

export const metadata: Metadata = { title: fa.admin.catalog.brands };

/** برندها (FR-ADM-03) */
export default async function BrandsPage() {
  await requireStaff("products.manage");
  const brands = await listBrandsAdmin();
  const box = "rounded-card border-line bg-surface border p-4";
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{fa.admin.catalog.brands}</h1>
      <CatalogTabs active="brands" />
      <div className={box}>
        <BrandForm />
      </div>
      <ul className="space-y-2">
        {brands.map((b) => (
          <li key={b.id} className={`${box} space-y-1`}>
            <BrandForm brand={{ id: b.id, name: b.name, slug: b.slug }} />
            <small className="text-ink-2">
              {fa.admin.catalog.category.products(b._count.products)}
            </small>
          </li>
        ))}
      </ul>
    </div>
  );
}
