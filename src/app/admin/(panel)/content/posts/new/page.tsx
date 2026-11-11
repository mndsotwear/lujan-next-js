import type { Metadata } from "next";
import { PostForm } from "@/components/admin/PostForm";
import { fa } from "@/content/fa";
import { requireStaff } from "@/modules/admin/server";
import { productOptions } from "@/modules/recommendations/server";

export const metadata: Metadata = { title: fa.admin.content.posts.new };

export default async function NewPostPage() {
  await requireStaff("content.manage");
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{fa.admin.content.posts.new}</h1>
      <PostForm
        products={await productOptions()}
        initial={{
          title: "",
          slug: "",
          section: "guide",
          excerpt: "",
          body: "",
          tags: "",
          productIds: [],
          coverImage: null,
          coverAlt: "",
          publishAt: "",
          seoTitle: "",
          seoDescription: "",
          status: "DRAFT",
        }}
      />
    </div>
  );
}
