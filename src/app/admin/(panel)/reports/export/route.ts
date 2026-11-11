/** خروجی اکسل/CSV هر جدول گزارش (FR-ADM-13، D-049) */
import { toCsv } from "@/lib/csv";
import { writeTable } from "@/lib/excel";
import { buildTables, can, REPORT_TABLES, type ReportTable } from "@/modules/admin";
import { audit, getReport, parseRange, staffWith } from "@/modules/admin/server";
import { zeroResultQueries } from "@/modules/search/server";

export async function GET(req: Request) {
  const me = await staffWith("reports.view");
  if (!me) return new Response("Not found", { status: 404 });
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const type = (REPORT_TABLES as readonly string[]).includes(sp.type ?? "")
    ? (sp.type as ReportTable)
    : "category";
  const format = sp.format === "csv" ? "csv" : "xlsx";
  const range = parseRange(sp);
  const [report, zero] = await Promise.all([getReport(range), zeroResultQueries(200)]);
  const table = buildTables({ ...report, zero }, can(me.role, "products.price"))[type];
  await audit(me.id, "report.export", "report", type, { format, range: range.label });
  const name = `report-${type}-${new Date().toISOString().slice(0, 10)}`;
  if (format === "csv")
    return new Response(toCsv(table.headers, table.rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  const buf = await writeTable(table.title, table.headers, table.rows);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
