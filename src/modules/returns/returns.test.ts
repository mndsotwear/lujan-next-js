import { describe, expect, it } from "vitest";
import {
  isSafeImageName,
  returnableQuantities,
  returnEligibility,
  returnShippingPayer,
  sniffImage,
  validateReturn,
} from "./policy";

const DAY = 86_400_000;
const now = new Date("2026-11-04T10:00:00Z");

describe("returnEligibility (D-030)", () => {
  it("فقط پس از تحویل", () => {
    expect(returnEligibility({ status: "SHIPPED", deliveredAt: null }, now)).toMatchObject({
      ok: false,
      reason: "not_delivered",
    });
  });
  it("تا ۷ روز پس از تحویل", () => {
    const d = (days: number) => new Date(now.getTime() - days * DAY);
    expect(returnEligibility({ status: "DELIVERED", deliveredAt: d(0) }, now).ok).toBe(true);
    expect(returnEligibility({ status: "DELIVERED", deliveredAt: d(7) }, now).ok).toBe(true);
    expect(
      returnEligibility({ status: "DELIVERED", deliveredAt: new Date(d(7).getTime() - 1) }, now),
    ).toMatchObject({ ok: false, reason: "window_closed" });
  });
});

describe("returnableQuantities", () => {
  const items = [
    { id: "a", quantity: 2 },
    { id: "b", quantity: 1 },
  ];
  it("درخواست‌های قبلی کم می‌شوند؛ ردشده‌ها نه", () => {
    expect(
      returnableQuantities(items, [
        { status: "REQUESTED", items: [{ orderItemId: "a", quantity: 1 }] },
        { status: "REJECTED", items: [{ orderItemId: "b", quantity: 1 }] },
      ]),
    ).toEqual({ a: 1, b: 1 });
  });
  it("کمتر از صفر نمی‌شود", () =>
    expect(
      returnableQuantities(items, [
        { status: "APPROVED", items: [{ orderItemId: "b", quantity: 5 }] },
      ]),
    ).toEqual({ a: 2, b: 0 }));
});

describe("validateReturn", () => {
  const ok = {
    items: [{ orderItemId: "a", quantity: 1 }],
    reasonCode: "CHANGED_MIND",
    type: "REFUND",
    description: "اندازه‌اش مناسب نبود",
    imageCount: 0,
  };
  const left = { a: 2 };
  it("ورودی درست", () => expect(validateReturn(ok, left)).toBe(null));
  it("خطاها", () => {
    expect(validateReturn({ ...ok, items: [{ orderItemId: "a", quantity: 0 }] }, left)).toBe(
      "items",
    );
    expect(validateReturn({ ...ok, items: [{ orderItemId: "a", quantity: 3 }] }, left)).toBe("qty");
    expect(validateReturn({ ...ok, items: [{ orderItemId: "x", quantity: 1 }] }, left)).toBe("qty");
    expect(validateReturn({ ...ok, reasonCode: "X" }, left)).toBe("reason");
    expect(validateReturn({ ...ok, type: "GIFT" }, left)).toBe("type");
    expect(validateReturn({ ...ok, description: "کوتاه" }, left)).toBe("description");
    expect(validateReturn({ ...ok, imageCount: 4 }, left)).toBe("images");
  });
  it("کالای معیوب بدون تصویر پذیرفته نمی‌شود", () => {
    expect(validateReturn({ ...ok, reasonCode: "DEFECTIVE" }, left)).toBe("imageRequired");
    expect(validateReturn({ ...ok, reasonCode: "DEFECTIVE", imageCount: 1 }, left)).toBe(null);
  });
});

describe("پرداخت هزینه‌ی برگشت", () => {
  it("پشیمانی با مشتری، بقیه با فروشگاه", () => {
    expect(returnShippingPayer("CHANGED_MIND")).toBe("CUSTOMER");
    expect(returnShippingPayer("DEFECTIVE")).toBe("STORE");
    expect(returnShippingPayer("WRONG_ITEM")).toBe("STORE");
  });
});

describe("تصویر", () => {
  it("نوع از محتوا", () => {
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpg");
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toBe("png");
    const webp = new TextEncoder().encode("RIFF....WEBPVP8 ");
    expect(sniffImage(webp)).toBe("webp");
    expect(sniffImage(new TextEncoder().encode("<svg onload=alert(1)>"))).toBe(null);
    expect(sniffImage(new Uint8Array([]))).toBe(null);
  });
  it("نام امن", () => {
    expect(isSafeImageName("a1b2c3d4e5f6a7b8c9d0e1f2.jpg")).toBe(true);
    expect(isSafeImageName("../../etc/passwd")).toBe(false);
    expect(isSafeImageName("a1b2c3d4e5f6a7b8c9d0e1f2.svg")).toBe(false);
  });
});
