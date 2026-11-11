import type { Metadata } from "next";
import { CartPageView } from "@/components/cart/CartPageView";
import { fa } from "@/content/fa";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: fa.cart.title, robots: { index: false } };

export default function CartPage() {
  return <CartPageView />;
}
