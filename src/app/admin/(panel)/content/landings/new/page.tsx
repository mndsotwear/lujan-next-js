import type { Metadata } from "next";
import { LandingForm } from "@/components/admin/LandingForm";
import { fa } from "@/content/fa";
import { requireStaff } from "@/modules/admin/server";
import { productOptions } from "@/modules/recommendations/server";

export const metadata: Metadata = { title: fa.admin.content.landings.new };

export default async function NewLandingPage() {
  await requireStaff("content.manage");
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{fa.admin.content.landings.new}</h1>
      <LandingForm
        products={await productOptions()}
        initial={{
          title: "",
          slug: "",
          intro: "",
          productIds: [],
          couponCode: "",
          coverImage: null,
          coverAlt: "",
          startsAt: "",
          endsAt: "",
          isActive: true,
          seoDescription: "",
        }}
      />
    </div>
  );
}
