"use client";
import { fa } from "@/content/fa";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-ctl bg-copper text-copper-ink min-h-11 px-5 font-bold"
    >
      {fa.checkout.invoice.print}
    </button>
  );
}
