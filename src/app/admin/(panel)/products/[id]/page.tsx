import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageManager } from "@/components/admin/ImageManager";
import { ProductForm } from "@/components/admin/ProductForm";
import { PublishBar } from "@/components/admin/PublishBar";
import { VariantEditor } from "@/components/admin/VariantEditor";
import { fa } from "@/content/fa";
import { can } from "@/modules/admin";
import { requireStaff } from "@/modules/admin/server";
import { availableQty, formatAttributes, type SpecField } from "@/modules/catalog";
import { getProductAdmin, listBrandsAdmin, listCategoriesAdmin } from "@/modules/catalog/server";

export const metadata: Metadata = { title: fa.admin.catalog.products };

/** ویرایش محصول: اطلاعات، تصویرها، نوع‌ها (FR-ADM-01) */
export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireStaff("products.manage");
  const { id } = await params;
  const p = /^[a-z0-9]{20,40}$/.test(id) ? await getProductAdmin(id) : null;
  if (!p) notFound();
  const [categories, brands] = await Promise.all([listCategoriesAdmin(), listBrandsAdmin()]);
  const t = fa.admin.catalog;
  const box = "rounded-card border-line bg-surface space-y-4 border p-5";
  return (
    <div className="space-y-5">
      <Link href="/admin/products" className="text-ink-2 text-sm underline">
        {t.back}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{p.name}</h1>
        {p.status === "PUBLISHED" && (
          <Link
            href={`/products/${p.slug}`}
            target="_blank"
            className="text-copper text-sm underline"
          >
            {t.view}
          </Link>
        )}
      </div>
      <PublishBar
        productId={p.id}
        status={p.status}
        hasPricedVariant={p.variants.some((v) => v.isActive && v.price > 0)}
      />
      <ProductForm
        key={p.status}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          specSchema: (c.specSchema ?? []) as unknown as SpecField[],
        }))}
        brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        initial={{
          id: p.id,
          name: p.name,
          slug: p.slug,
          categoryId: p.categoryId,
          brandId: p.brandId,
          summary: p.summary ?? "",
          description: p.description ?? "",
          warrantyMonths: p.warrantyMonths ? String(p.warrantyMonths) : "",
          warrantyNote: p.warrantyNote ?? "",
          tags: p.tags.join("، "),
          flavors: p.flavors,
          status: p.status,
          seoTitle: p.seoTitle ?? "",
          seoDescription: p.seoDescription ?? "",
          specs: (p.specs ?? {}) as Record<string, string | number | boolean>,
        }}
      />
      <section className={box}>
        <h2 className="font-bold">{t.sections.images}</h2>
        <ImageManager
          productId={p.id}
          images={p.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt }))}
        />
      </section>
      <section className={box}>
        <h2 className="font-bold">{t.sections.variants}</h2>
        <VariantEditor
          productId={p.id}
          canPrice={can(me.role, "products.price")}
          variants={p.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            attributes: formatAttributes((v.attributes ?? {}) as Record<string, string>),
            price: v.price,
            salePrice: v.salePrice,
            wholesale: v.priceTiers[0]?.price ?? null,
            // قیمت خرید فقط به مدیر کل فرستاده می‌شود (D-050)
            costPrice: can(me.role, "products.price") ? v.costPrice : null,
            weightGrams: v.weightGrams,
            lengthCm: v.lengthCm,
            widthCm: v.widthCm,
            heightCm: v.heightCm,
            minOrderQty: v.minOrderQty,
            isActive: v.isActive,
            available: v.inventory ? availableQty(v.inventory) : 0,
          }))}
        />
      </section>
    </div>
  );
}
