import type { Metadata } from "next";
import { UnsubscribeForm } from "@/components/newsletter/UnsubscribeForm";
import { fa } from "@/content/fa";
import { maskAddress } from "@/modules/newsletter";
import { getSubscriberByToken } from "@/modules/newsletter/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: fa.newsletter.unsubscribeTitle,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/** لغو عضویت با پیوند ایمیل (D-055) — با دکمه، نه با باز شدن پیوند */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const t = fa.newsletter;
  const token = ((await searchParams).t ?? "").slice(0, 64);
  const s = token ? await getSubscriberByToken(token) : null;
  return (
    <main className="mx-auto max-w-[560px] space-y-4 px-4 py-12">
      <h1 className="text-2xl font-bold">{t.unsubscribeTitle}</h1>
      {!s ? (
        <p className="text-bad">{t.errors.badLink}</p>
      ) : s.unsubscribedAt ? (
        <p>{t.alreadyOut}</p>
      ) : (
        <>
          <p dir="auto">{t.unsubscribeBody(maskAddress(s))}</p>
          <UnsubscribeForm token={token} />
        </>
      )}
    </main>
  );
}
