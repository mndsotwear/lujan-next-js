import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingForm } from "@/components/admin/LandingForm";
import { fa } from "@/content/fa";
import { formatJalaliInput } from "@/lib/jalali";
import { requireStaff } from "@/modules/admin/server";
import { getLandingAdmin } from "@/modules/content/server";
import { productOptions } from "@/modules/recommendations/server";

export const metadata: Metadata = { title: fa.admin.content.landings.edit };

export default async function EditLandingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("content.manage");
  const { id } = await params;
  const [l, products] = await Promise.all([getLandingAdmin(id), productOptions()]);
  if (!l) notFound();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{l.title}</h1>
      <LandingForm
        products={products}
        initial={{
          id: l.id,
          title: l.title,
          slug: l.slug,
          intro: l.intro ?? "",
          productIds: l.productIds,
          couponCode: l.couponCode ?? "",
          coverImage: l.coverImage,
          coverAlt: l.coverAlt ?? "",
          startsAt: formatJalaliInput(l.startsAt),
          endsAt: formatJalaliInput(l.endsAt),
          isActive: l.isActive,
          seoDescription: l.seoDescription ?? "",
        }}
      />
    </div>
  );
}
