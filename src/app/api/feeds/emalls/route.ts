/** خروجی ایمالز: فهرست صفحه‌بندی‌شده‌ی محصولات (?page=1) */
import { getFeedProducts } from "@/modules/catalog/server";
import { emallsItem, paginate } from "@/modules/feeds/torob";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const p = paginate(await getFeedProducts(), new URL(req.url).searchParams.get("page"));
  return Response.json(
    {
      page: p.page,
      max_pages: p.maxPages,
      total: p.total,
      products: p.items.map((x) => emallsItem(x, site)),
    },
    { headers: { "Cache-Control": "public, max-age=600" } },
  );
}
