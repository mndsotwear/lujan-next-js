import type { Metadata } from "next";
import { fa } from "@/content/fa";

export const metadata: Metadata = {
  title: { default: fa.admin.title, template: `%s | ${fa.admin.title}` },
  robots: { index: false, follow: false },
};

export default function AdminRoot({ children }: Readonly<{ children: React.ReactNode }>) {
  // تم لیکوئید گلس (تیره) فقط برای پنل مدیریت؛ فروشگاه لایت می‌ماند
  return <div className="admin-glass min-h-dvh">{children}</div>;
}
