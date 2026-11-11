import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/account/LoginForm";
import { Ruler } from "@/components/Ruler";
import { fa } from "@/content/fa";
import { getCurrentUser } from "@/modules/account/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: fa.account.loginTitle, robots: { index: false } };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  if (await getCurrentUser())
    redirect(next?.startsWith("/") && !next.startsWith("//") ? next : "/account");
  return (
    <main className="mx-auto max-w-[1240px] px-4 py-12">
      <div className="mx-auto max-w-sm">
        <h1 className="text-2xl font-bold">{fa.account.loginTitle}</h1>
        <p className="text-ink-2 mt-2 text-sm">{fa.account.loginSub}</p>
        <Ruler className="my-6" />
      </div>
      <LoginForm next={next} devMode={(process.env.SMS_PROVIDER ?? "dev") === "dev"} />
    </main>
  );
}
