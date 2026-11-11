import type { Metadata } from "next";
import { ActivateForm } from "@/components/admin/ActivateForm";
import { fa } from "@/content/fa";

export const metadata: Metadata = { title: fa.admin.activate.title };

export default function ActivatePage() {
  return <ActivateForm devMode={(process.env.SMS_PROVIDER ?? "dev") === "dev"} />;
}
