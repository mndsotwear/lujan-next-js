import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { fa } from "@/content/fa";
import { getStaff } from "@/modules/admin/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: fa.admin.login.title };

export default async function AdminLoginPage() {
  if (await getStaff()) redirect("/admin");
  return <AdminLoginForm />;
}
