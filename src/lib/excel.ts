/** خواندن و نوشتن جدول اکسل (xlsx) با سرستون فارسی و راست‌به‌چپ (D-049) — فقط سرور */
import ExcelJS from "exceljs";
import { parseCsv } from "./csv";

const isXlsx = (b: Uint8Array) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;

/** فایل بارگذاری‌شده (xlsx یا CSV) ← جدول متن؛ فقط برگه‌ی اول */
export async function readTable(bytes: Uint8Array): Promise<string[][]> {
  if (!isXlsx(bytes)) return parseCsv(new TextDecoder("utf-8").decode(bytes));
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  );
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const out: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    for (let c = 1; c <= ws.columnCount; c++) {
      const v = row.getCell(c);
      cells.push(v.text?.trim() ?? "");
    }
    if (cells.some((x) => x)) out.push(cells);
  });
  return out;
}

export async function writeTable(
  sheet: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "لوجان";
  const ws = wb.addWorksheet(sheet.slice(0, 31), {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  });
  ws.addRow(headers).font = { bold: true };
  for (const r of rows) ws.addRow(r.map((v) => (v === null || v === undefined ? "" : v)));
  ws.columns.forEach((col, i) => {
    const longest = Math.max(
      headers[i]?.length ?? 8,
      ...rows.slice(0, 200).map((r) => String(r[i] ?? "").length),
    );
    col.width = Math.min(50, Math.max(10, longest + 2));
  });
  return Buffer.from(await wb.xlsx.writeBuffer());
}
