/**
 * پیامک دریافتی از سرویس پیامک (D-055): «لغو۱» = لغو خبرنامه‌ی پیامکی همان شماره.
 * نشانی در پنل سرویس پیامک: https://<دامنه>/api/sms/inbound?key=<SMS_INBOUND_KEY>
 * نام پارامترها در سرویس‌ها فرق دارد؛ from/sender/mobile و message/text/body پذیرفته می‌شوند (GET یا POST).
 */
import { timingSafeEqual } from "node:crypto";
import { normalizeMobile } from "@/modules/account";
import { isOptOutText } from "@/modules/newsletter";
import { optOut } from "@/modules/newsletter/server";

function keyOk(given: string | null): boolean {
  const want = process.env.SMS_INBOUND_KEY ?? "";
  if (want.length < 16 || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handle(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (!keyOk(url.searchParams.get("key"))) return new Response("Not found", { status: 404 });
  const params = new URLSearchParams(url.search);
  if (req.method === "POST") {
    const type = req.headers.get("content-type") ?? "";
    if (type.includes("json")) {
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      for (const [k, v] of Object.entries(body)) params.set(k, String(v));
    } else {
      const form = await req.formData().catch(() => null);
      form?.forEach((v, k) => typeof v === "string" && params.set(k, v));
    }
  }
  const from = normalizeMobile(
    params.get("from") ?? params.get("sender") ?? params.get("mobile") ?? "",
  );
  const text = params.get("message") ?? params.get("text") ?? params.get("body") ?? "";
  if (from && isOptOutText(text)) await optOut({ channel: "SMS", address: from });
  // همیشه ۲۰۰ تا سرویس پیامک دوباره نفرستد؛ چیزی درباره‌ی عضویت فاش نمی‌شود
  return new Response("ok");
}

export const GET = handle;
export const POST = handle;
