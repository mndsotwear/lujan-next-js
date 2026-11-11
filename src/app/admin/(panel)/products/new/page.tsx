import type { Metadata } from "next";
import Link from "next/link";
import { ProductForm } from "@/components/admin/ProductForm";
import { fa } from "@/content/fa";
import { requireStaff } from "@/modules/admin/server";
import type { SpecField } from "@/modules/catalog";
import { listBrandsAdmin, listCategoriesAdmin } from "@/modules/catalog/server";

export const metadata: Metadata = { title: fa.admin.catalog.newProduct };

/** محصول تازه: اول اطلاعات اصلی، بعد تصویر و نوع (FR-ADM-01) */
export default async function NewProductPage() {
  await requireStaff("products.manage");
  const [categories, brands] = await Promise.all([listCategoriesAdmin(), listBrandsAdmin()]);
  const t = fa.admin.catalog;
  return (
    <div className="space-y-5">
      <Link href="/admin/products" className="text-ink-2 text-sm underline">
        {t.back}
      </Link>
      <h1 className="text-2xl font-bold">{t.newProduct}</h1>
      <p className="text-ink-2 text-sm">{t.createFirst}</p>
      <ProductForm
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          specSchema: (c.specSchema ?? []) as unknown as SpecField[],
        }))}
        brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        initial={{
          name: "",
          slug: "",
          categoryId: categories[0]?.id ?? "",
          brandId: brands[0]?.id ?? "",
          summary: "",
          description: "",
          warrantyMonths: "",
          warrantyNote: "",
          tags: "",
          status: "DRAFT",
          seoTitle: "",
          seoDescription: "",
          specs: {},
        }}
      />
    </div>
  );
}
