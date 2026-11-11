import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostForm } from "@/components/admin/PostForm";
import { fa } from "@/content/fa";
import { formatJalaliInput } from "@/lib/jalali";
import { requireStaff } from "@/modules/admin/server";
import { getPostAdmin } from "@/modules/content/server";
import { productOptions } from "@/modules/recommendations/server";

export const metadata: Metadata = { title: fa.admin.content.posts.edit };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("content.manage");
  const { id } = await params;
  const [p, products] = await Promise.all([getPostAdmin(id), productOptions()]);
  if (!p) notFound();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{p.title}</h1>
      <PostForm
        products={products}
        initial={{
          id: p.id,
          title: p.title,
          slug: p.slug,
          section: p.section,
          excerpt: p.excerpt ?? "",
          body: p.body,
          tags: p.tags.join("، "),
          productIds: p.productIds,
          coverImage: p.coverImage,
          coverAlt: p.coverAlt ?? "",
          publishAt: formatJalaliInput(p.publishedAt),
          seoTitle: p.seoTitle ?? "",
          seoDescription: p.seoDescription ?? "",
          status: p.status,
        }}
      />
    </div>
  );
}
