import Link from "next/link";
import { fa } from "@/content/fa";
import { NewsletterForm } from "../newsletter/NewsletterForm";

/** پاورقی لوجان: بلوک آبی تیره با ستون‌های لینک و کارت خبرنامه */
export function SiteFooter() {
  const col = (title: string, items: readonly { label: string; href: string | null }[]) => (
    <div>
      <h2 className="mb-4 text-base font-black text-white">{title}</h2>
      <ul className="space-y-2.5 text-sm text-white/75">
        {items.map((i) => (
          <li key={i.label}>
            {i.href ? (
              <Link href={i.href} className="hover:text-white hover:underline">
                {i.label}
              </Link>
            ) : (
              i.label
            )}
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <footer className="mt-20 bg-[#0b1f4d] text-white">
      <div className="mx-auto max-w-[1240px] px-4">
        <div className="bg-surface text-ink rounded-sheet shadow-card -translate-y-10 p-6 sm:p-8">
          <div className="mx-auto max-w-xl">
            <NewsletterForm />
          </div>
        </div>
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-10 pb-12 max-md:grid-cols-2">
          <div className="max-md:col-span-2">
            <Link href="/" className="mb-4 flex items-center gap-2">
              <span className="text-copper grid size-10 place-items-center rounded-2xl bg-white text-xl font-black">
                ل
              </span>
              <span className="text-2xl font-black">{fa.site.name}</span>
            </Link>
            <p className="mb-5 max-w-[40ch] text-sm leading-7 text-white/75">{fa.footer.about}</p>
            <span className="grid size-[84px] place-items-center rounded-2xl border border-dashed border-white/30 text-center text-xs text-white/60">
              {fa.footer.trustPlaceholder}
            </span>
          </div>
          {col(fa.footer.shopping, fa.footer.shoppingLinks)}
          {col(fa.footer.salons, fa.footer.salonLinks)}
          {col(fa.footer.store, fa.footer.storeLinks)}
        </div>
      </div>
      <div className="border-t border-white/15 py-5 text-center text-xs text-white/60">
        {fa.footer.copyright}
      </div>
    </footer>
  );
}
