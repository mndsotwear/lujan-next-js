import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "./csv";

describe("CSV (D-049)", () => {
  it("BOM، نقل‌قول و ویرگول", () => {
    const s = toCsv(
      ["نام", "قیمت"],
      [
        ["قیچی, حرفه‌ای", 1000],
        ['گفت "سلام"', null],
      ],
    );
    expect(s.startsWith("﻿")).toBe(true);
    expect(s).toContain('"قیچی, حرفه‌ای"');
    expect(s).toContain('"گفت ""سلام"""');
  });
  it("جلوگیری از تزریق فرمول؛ عدد منفی سالم", () => {
    const s = toCsv(["a"], [["=HYPERLINK(1)"], ["-5"]]);
    expect(s).toContain("'=HYPERLINK(1)");
    expect(s).toContain("\r\n-5\r\n");
  });
  it("رفت و برگشت", () => {
    const rows = parseCsv(
      toCsv(
        ["x", "y"],
        [
          ["a,b", "c\nd"],
          ["", "e"],
        ],
      ),
    );
    expect(rows).toEqual([
      ["x", "y"],
      ["a,b", "c\nd"],
      ["", "e"],
    ]);
  });
});
