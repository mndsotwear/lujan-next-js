/** فهرست فعال خبرنامه برای بارگذاری در سرویس پیامک/ایمیل (FR-MKT-01، D-055) — فقط marketing.manage */
import { fa } from "@/content/fa";
import { toCsv } from "@/lib/csv";
import { audit, staffWith } from "@/modules/admin/server";
import { activeSubscribers } from "@/modules/newsletter/server";
import { absUrl } from "@/modules/seo";

export async function GET() {
  const me = await staffWith("marketing.manage");
  if (!me) return new Response("Not found", { status: 404 });
  const t = fa.admin.marketing.newsletter;
  const rows = await activeSubscribers();
  await audit(me.id, "newsletter.export", "subscriber", "all", { count: rows.length });
  const csv = toCsv(
    [t.csv.channel, t.csv.address, t.csv.consentAt, t.csv.source, t.csv.unsubscribeUrl],
    rows.map((r) => [
      r.channel,
      r.address,
      r.consentAt.toISOString(),
      r.source,
      absUrl(`/unsubscribe?t=${r.token}`),
    ]),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="newsletter-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
