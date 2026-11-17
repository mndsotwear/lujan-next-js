/** وب‌سرویس ترب: فهرست صفحه‌بندی‌شده‌ی محصولات (GET یا POST با page) */
import { getFeedProducts } from "@/modules/catalog/server";
import { paginate, torobItem } from "@/modules/feeds/torob";

export const dynamic = "force-dynamic";

async function respond(page: unknown) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const all = await getFeedProducts();
  const p = paginate(all, page);
  return Response.json(
    {
      api_version: "torob_api_v3",
      current_page: p.page,
      total: p.total,
      max_pages: p.maxPages,
      products: p.items.map((x) => torobItem(x, site)),
    },
    { headers: { "Cache-Control": "public, max-age=600" } },
  );
}

export async function GET(req: Request) {
  return respond(new URL(req.url).searchParams.get("page"));
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { page?: unknown };
  return respond(body.page ?? new URL(req.url).searchParams.get("page"));
}
