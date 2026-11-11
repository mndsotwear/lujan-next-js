import type { Metadata } from "next";
import Link from "next/link";
import { SetupForm } from "@/components/admin/SetupForm";
import { fa } from "@/content/fa";
import { getSetupUser, otpauthUri, qrSvg } from "@/modules/admin/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: fa.admin.activate.setupTitle };

/** رمز و اتصال اپ کدساز — فقط با توکن فعال‌سازی معتبر (D-035) */
export default async function SetupPage() {
  const t = fa.admin.activate;
  const setup = await getSetupUser();
  if (!setup)
    return (
      <div className="rounded-card border-line bg-surface border p-6">
        <p className="text-bad">{t.expired}</p>
        <Link href="/admin/activate" className="text-copper mt-4 inline-block underline">
          {t.title}
        </Link>
      </div>
    );
  if (setup.done) return <SetupForm qr="" manualKey="" done />;
  const svg = await qrSvg(otpauthUri(fa.site.name, setup.mobile, setup.secret));
  return <SetupForm qr={svg} manualKey={setup.secret.replace(/(.{4})/g, "$1 ").trim()} />;
}
