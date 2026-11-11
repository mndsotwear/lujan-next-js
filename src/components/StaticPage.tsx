/** صفحه‌ی ثابت فروشگاه از متن پنل (D-036) */
import { fa } from "@/content/fa";
import type { PageSlug } from "@/modules/content";
import { getPage } from "@/modules/content/server";
import { RichText } from "./RichText";

export async function StaticPage({ slug, top }: { slug: PageSlug; top?: React.ReactNode }) {
  const page = await getPage(slug);
  return (
    <main className="mx-auto max-w-[760px] px-4 pb-24 lg:pb-8">
      <h1 className="mt-6 mb-6 text-2xl font-bold">{page?.title ?? fa.pages.titles[slug]}</h1>
      {top}
      {page ? (
        <>
          <RichText text={page.body} className="text-ink-2" />
          <p className="text-steel mt-8 text-xs">
            {fa.pages.updated(
              new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "long" }).format(
                page.updatedAt,
              ),
            )}
          </p>
        </>
      ) : (
        <p className="text-ink-2">{fa.pages.pending}</p>
      )}
    </main>
  );
}
