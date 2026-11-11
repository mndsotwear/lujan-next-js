"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fa } from "@/content/fa";
import { retryPayment } from "@/modules/checkout/actions";

export function RetryPayment({ number }: { number: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await retryPayment(number);
          if (r.ok) {
            if (r.redirect.startsWith("/")) router.push(r.redirect);
            else window.location.href = r.redirect;
          } else {
            setBusy(false);
            setErr(r.message);
            router.refresh();
          }
        }}
        className="rounded-ctl bg-copper text-copper-ink min-h-12 px-6 font-bold disabled:opacity-60"
      >
        {fa.checkout.result.retry}
      </button>
      {err && <p className="text-bad mt-2 text-sm">{err}</p>}
    </div>
  );
}
