import type { Metadata } from "next";
import { StaticPage } from "@/components/StaticPage";
import { fa } from "@/content/fa";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: fa.pages.titles.terms };

export default function Page() {
  return <StaticPage slug="terms" />;
}
