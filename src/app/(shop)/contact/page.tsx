import type { Metadata } from "next";
import { StoreInfo } from "@/components/content/StoreInfo";
import { StaticPage } from "@/components/StaticPage";
import { fa } from "@/content/fa";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: fa.pages.titles.contact };

export default function Page() {
  return <StaticPage slug="contact" top={<StoreInfo />} />;
}
