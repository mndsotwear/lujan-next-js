import { describe, expect, it } from "vitest";
import { activeStories, isSafeStoryName, kindOf, parseRange, sniffStoryMedia } from "./rules";

const bytes = (...xs: (number | string)[]) =>
  new Uint8Array(
    xs.flatMap((x) => (typeof x === "string" ? [...x].map((c) => c.charCodeAt(0)) : [x])),
  );

describe("sniffStoryMedia", () => {
  it("عکس و ویدیو را از محتوا تشخیص می‌دهد", () => {
    expect(sniffStoryMedia(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpg");
    expect(sniffStoryMedia(bytes(0x89, "PNG"))).toBe("png");
    expect(sniffStoryMedia(bytes("RIFF", 0, 0, 0, 0, "WEBP"))).toBe("webp");
    expect(sniffStoryMedia(bytes(0, 0, 0, 0x20, "ftypisom"))).toBe("mp4");
    expect(sniffStoryMedia(bytes("<svg onload"))).toBeNull();
    expect(kindOf("mp4")).toBe("video");
    expect(kindOf("webp")).toBe("image");
  });
  it("نام فایل امن", () => {
    expect(isSafeStoryName("a1b2c3d4e5f6a7b8c9d0e1f2.mp4")).toBe(true);
    expect(isSafeStoryName("../x.mp4")).toBe(false);
    expect(isSafeStoryName("a1b2c3d4e5f6a7b8c9d0e1f2.svg")).toBe(false);
  });
});

describe("activeStories", () => {
  const now = new Date("2026-11-12T12:00:00Z");
  const s = (
    id: string,
    o: Partial<{
      isActive: boolean;
      startsAt: Date | null;
      endsAt: Date | null;
      sortOrder: number;
      slides: number[];
    }> = {},
  ) => ({
    id,
    isActive: true,
    startsAt: null,
    endsAt: null,
    sortOrder: 0,
    slides: [1],
    ...o,
  });
  it("خاموش، بی‌اسلاید و بیرون از بازه حذف؛ به ترتیب", () => {
    const rows = [
      s("b", { sortOrder: 2 }),
      s("a", { sortOrder: 1 }),
      s("off", { isActive: false }),
      s("empty", { slides: [] }),
      s("later", { startsAt: new Date("2026-11-13T00:00:00Z") }),
      s("ended", { endsAt: new Date("2026-11-11T00:00:00Z") }),
    ];
    expect(activeStories(rows, now).map((r) => r.id)).toEqual(["a", "b"]);
  });
});

describe("parseRange", () => {
  it("بازه‌های معتبر و نامعتبر", () => {
    expect(parseRange("bytes=0-99", 1000)).toEqual({ start: 0, end: 99 });
    expect(parseRange("bytes=900-", 1000)).toEqual({ start: 900, end: 999 });
    expect(parseRange("bytes=-100", 1000)).toEqual({ start: 900, end: 999 });
    expect(parseRange("bytes=0-5000", 1000)).toEqual({ start: 0, end: 999 });
    expect(parseRange("bytes=2000-", 1000)).toBeNull();
    expect(parseRange(null, 1000)).toBeNull();
    expect(parseRange("items=0-1", 1000)).toBeNull();
  });
});
