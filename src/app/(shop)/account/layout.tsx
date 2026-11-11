import { AccountNav } from "@/components/account/AccountNav";
import { fa } from "@/content/fa";
import { formatMobile } from "@/modules/account";
import { getCurrentUser } from "@/modules/account/server";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const u = await getCurrentUser();
  if (!u) return children; // هر صفحه خودش با مسیر خودش به ورود می‌فرستد (requireUser)
  return (
    <main className="mx-auto max-w-[1240px] px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{fa.account.hello(u.name)}</h1>
        <p className="text-steel text-sm">{formatMobile(u.mobile)}</p>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[200px_1fr]">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
