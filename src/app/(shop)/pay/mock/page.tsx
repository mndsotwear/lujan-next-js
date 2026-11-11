import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fa } from "@/content/fa";
import { db } from "@/lib/db";
import { formatToman, formatOrderNumber } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: fa.checkout.mock.title, robots: { index: false } };

/** درگاه پرداخت آزمایشی (D-023) — در محیط تولید غیرفعال است مگر ALLOW_MOCK_GATEWAY=1 */
export default async function MockGateway({
  searchParams,
}: {
  searchParams: Promise<{ authority?: string }>;
}) {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_GATEWAY !== "1") notFound();
  const { authority = "" } = await searchParams;
  const p = await db.payment.findUnique({
    where: { authority },
    include: { order: { select: { number: true } } },
  });
  if (!p) notFound();
  const back = (status: "OK" | "NOK") =>
    `/api/payment/callback?Authority=${encodeURIComponent(authority)}&Status=${status}`;
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-sheet border-warn bg-surface border-2 border-dashed p-6">
        <p className="rounded-ctl bg-warn/15 text-warn mb-4 px-3 py-2 text-sm font-bold">
          {fa.checkout.mock.banner}
        </p>
        <h1 className="text-xl font-bold">{fa.checkout.mock.title}</h1>
        <dl className="my-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-steel">{fa.checkout.mock.order}</dt>
          <dd>#{formatOrderNumber(p.order.number)}</dd>
          <dt className="text-steel">{fa.checkout.mock.amount}</dt>
          <dd className="font-bold">{formatToman(p.amount)}</dd>
          <dt className="text-steel">{fa.checkout.mock.authority}</dt>
          <dd dir="ltr" className="text-xs">
            {authority}
          </dd>
        </dl>
        <div className="grid gap-3">
          <a
            href={back("OK")}
            className="rounded-ctl bg-ok grid min-h-12 place-items-center font-bold text-white"
          >
            {fa.checkout.mock.success}
          </a>
          <a
            href={back("NOK")}
            className="rounded-ctl border-bad text-bad grid min-h-12 place-items-center border-[1.5px] font-bold"
          >
            {fa.checkout.mock.fail}
          </a>
        </div>
      </div>
    </main>
  );
}
