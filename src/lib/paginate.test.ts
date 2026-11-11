import { describe, expect, it } from "vitest";
import { pageOf, paginate } from "./paginate";

describe("صفحه‌بندی پنل", () => {
  it("برش و محدود کردن شماره‌ی صفحه", () => {
    const rows = Array.from({ length: 120 }, (_, i) => i);
    expect(paginate(rows, 1).items).toHaveLength(50);
    expect(paginate(rows, 3).items).toEqual(rows.slice(100));
    expect(paginate(rows, 99).page).toBe(3);
    expect(paginate([], 1)).toMatchObject({ page: 1, pages: 1, total: 0 });
  });
  it("شماره‌ی صفحه از نشانی، با ارقام فارسی", () => {
    expect(pageOf("۲")).toBe(2);
    expect(pageOf("0")).toBe(1);
    expect(pageOf(undefined)).toBe(1);
  });
});
