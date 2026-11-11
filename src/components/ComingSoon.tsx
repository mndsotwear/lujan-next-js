import Link from "next/link";
import { fa } from "@/content/fa";
import { Ruler } from "./Ruler";

/** صفحه‌ی موقت برای بخش‌هایی که در مراحل بعد ساخته می‌شوند (تا لینک‌های منو ۴۰۴ ندهند). */
export function ComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto max-w-[1240px] px-4 py-16">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-ink-2 mt-2 max-w-[52ch]">{body}</p>
      <Ruler className="my-8 max-w-sm" />
      <Link
        href="/categories/instant-coffee"
        className="rounded-ctl bg-copper text-copper-ink inline-grid min-h-12 place-items-center px-5 font-bold"
      >
        {fa.soon.cta}
      </Link>
    </main>
  );
}
