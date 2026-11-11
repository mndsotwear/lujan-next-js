import Link from "next/link";

/** صفحه‌های ورود و فعال‌سازی: کارت وسط صفحه، بدون منوی پنل */
export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-6 text-lg font-black">
        <span className="text-copper">لوجان</span>{" "}
        <span className="text-ink-2 text-sm font-medium">پنل مدیریت</span>
      </Link>
      {children}
    </main>
  );
}
