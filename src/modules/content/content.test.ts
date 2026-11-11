import { describe, expect, it } from "vitest";
import { activeBanners, safeLink } from "./rules";

describe("بنر (D-048)", () => {
  const now = new Date("2026-11-04T10:00:00Z");
  const b = (
    o: Partial<{
      isActive: boolean;
      startsAt: Date | null;
      endsAt: Date | null;
      sortOrder: number;
      id: string;
    }>,
  ) => ({
    id: "x",
    isActive: true,
    startsAt: null,
    endsAt: null,
    sortOrder: 0,
    ...o,
  });
  it("بازه‌ی نمایش و ترتیب", () => {
    const rows = [
      b({ id: "late", sortOrder: 2 }),
      b({ id: "first", sortOrder: 1 }),
      b({ id: "off", isActive: false }),
      b({ id: "future", startsAt: new Date("2026-12-01") }),
      b({ id: "past", endsAt: new Date("2026-10-01") }),
    ];
    expect(activeBanners(rows, now).map((r) => r.id)).toEqual(["first", "late"]);
  });
  it("لینک امن", () => {
    expect(safeLink("/categories/instant-coffee")).toBe("/categories/instant-coffee");
    expect(safeLink("https://example.com/a")).toBe("https://example.com/a");
    expect(safeLink("javascript:alert(1)")).toBe(null);
    expect(safeLink("//evil.com")).toBe(null);
    expect(safeLink("http://example.com")).toBe(null);
    expect(safeLink("")).toBe(null);
  });
});
