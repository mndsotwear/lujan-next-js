/** چالش کپچا (D-059) — بدون کش، با محدودیت نرخ */
import { hit } from "@/lib/rate-limit";
import { authSecret, clientIp, newChallenge } from "@/modules/account/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const ip = (await clientIp()) ?? "unknown";
  if (!hit(`captcha:${ip}`, 30, 10 * 60_000)) return new Response("Too many", { status: 429 });
  return Response.json(newChallenge(authSecret()), { headers: { "Cache-Control": "no-store" } });
}
