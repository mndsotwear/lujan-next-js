import type { Metadata } from "next";
import { STORE } from "@/config/store";
import { fa } from "@/content/fa";
import { formatNumber } from "@/lib/format";
import { SHIPPING_METHODS } from "@/modules/checkout";

export const metadata: Metadata = {
  title: fa.returns.title,
  description: fa.returns.policy[0]!.body,
};

/** شرایط مرجوعی و ارسال (FR-RET-04، FR-SHP-03، D-029، D-030) */
export default function ReturnsPolicyPage() {
  const t = fa.returns;
  const cfg = STORE.shipping.methods;
  return (
    <main className="mx-auto max-w-[760px] px-4 pb-24 lg:pb-8">
      <h1 className="mt-6 mb-6 text-2xl font-bold">{t.title}</h1>
      <div className="space-y-6">
        {t.policy.map((s) => (
          <section key={s.id} id={s.id}>
            <h2 className="mb-1 font-bold">{s.title}</h2>
            <p className="text-ink-2 leading-8">{s.body}</p>
          </section>
        ))}
      </div>
      <section id="shipping" className="mt-10 scroll-mt-28">
        <h2 className="mb-2 text-xl font-bold">{t.shippingTitle}</h2>
        <p className="text-ink-2 mb-4 leading-8">{t.shippingIntro}</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-line text-steel border-b text-start">
              <th className="py-2 text-start font-medium">{t.shippingMethod}</th>
              <th className="py-2 text-start font-medium">{t.shippingEta}</th>
              <th className="py-2 text-start font-medium">{fa.checkout.shippingLine}</th>
            </tr>
          </thead>
          <tbody>
            {SHIPPING_METHODS.map((m) => (
              <tr key={m} className="border-line border-b">
                <td className="py-3">
                  {m === "PICKUP"
                    ? fa.checkout.pickupAt(STORE.storeLocation.city)
                    : m === "COURIER"
                      ? `${fa.checkout.methods[m]} (${STORE.storeLocation.city})`
                      : fa.checkout.methods[m]}
                </td>
                <td className="text-ink-2 py-3">{cfg[m].eta}</td>
                <td className="py-3">
                  {cfg[m].base === 0
                    ? fa.checkout.free
                    : `${t.shippingFrom} ${formatNumber(cfg[m].base - cfg[m].sameProvinceDiscount)} ${fa.units.toman}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
