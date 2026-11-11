import type { Metadata } from "next";
import Link from "next/link";
import { TrackForm } from "@/components/track/TrackForm";
import { fa } from "@/content/fa";

export const metadata: Metadata = { title: fa.track.title, robots: { index: false } };

/** پیگیری سفارش برای مهمان و کاربر (FR-SHP-05) */
export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }>;
}) {
  const { n } = await searchParams;
  return (
    <main className="mx-auto max-w-[760px] px-4 pb-24 lg:pb-8">
      <h1 className="mt-6 mb-2 text-2xl font-bold">{fa.track.title}</h1>
      <p className="text-ink-2 mb-6">{fa.track.intro}</p>
      <TrackForm initialNumber={n && /^\d{1,9}$/.test(n) ? n : undefined} />
      <p className="text-ink-2 mt-8 text-sm">
        {fa.track.accountHint}{" "}
        <Link href="/account/orders" className="text-copper underline">
          {fa.track.myOrders}
        </Link>
      </p>
    </main>
  );
}
