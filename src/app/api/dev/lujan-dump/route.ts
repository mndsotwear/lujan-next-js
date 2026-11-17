/**
 * فقط در حالت توسعه: گرفتن خروجی محصولات lujan.ir از مرورگر و ذخیره در data/lujan-products.json
 * در production همیشه 404 است.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";

const cors = {
  "Access-Control-Allow-Origin": "https://lujan.ir",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Private-Network": "true",
};

export function OPTIONS() {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  return new Response(null, { status: 204, headers: cors });
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  const body = await req.text();
  const items = JSON.parse(body) as unknown[];
  await writeFile(path.join(process.cwd(), "data", "lujan-products.json"), body, "utf8");
  return Response.json({ ok: true, count: items.length }, { headers: cors });
}
