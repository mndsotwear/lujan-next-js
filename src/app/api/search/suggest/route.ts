import { NextResponse } from "next/server";
import { suggest } from "@/modules/search/server";

/** پیشنهاد خودکار (FR-SRCH-01): GET /api/search/suggest?q=... */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.slice(0, 100) ?? "";
  const started = Date.now();
  const data = await suggest(q);
  return NextResponse.json(data, {
    headers: { "Server-Timing": `search;dur=${Date.now() - started}`, "Cache-Control": "no-store" },
  });
}
