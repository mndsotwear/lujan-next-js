import { describe, expect, it } from "vitest";
import {
  canMoveReturn,
  defaultReturnRefund,
  needsTrackingCode,
  normalizeTrackingCode,
  operatorNextStatuses,
  refundableAmount,
  stockOnCancel,
  validateRefund,
  validTrackingCode,
} from "./fulfilment";

describe("operatorNextStatuses (FR-ADM-04)", () => {
  const next = (
    status: Parameters<typeof operatorNextStatuses>[0]["status"],
    m: "PICKUP" | "POST" = "POST",
  ) => operatorNextStatuses({ status, shippingMethod: m });
  it("پرداخت آنلاین را فقط درگاه تأیید می‌کند", () =>
    expect(next("PENDING_PAYMENT")).toEqual(["CANCELLED"]));
  it("مسیر ارسال", () => {
    expect(next("PAID")).toEqual(["PROCESSING", "CANCELLED"]);
    expect(next("PROCESSING")).toEqual(["SHIPPED", "CANCELLED"]);
    expect(next("SHIPPED")).toEqual(["DELIVERED"]);
    expect(next("DELIVERED")).toEqual([]); // مرجوعی فقط از گردش مرجوعی
  });
  it("مسیر تحویل حضوری", () => {
    expect(next("PROCESSING", "PICKUP")).toEqual(["READY_FOR_PICKUP", "CANCELLED"]);
    expect(next("READY_FOR_PICKUP", "PICKUP")).toEqual(["DELIVERED", "CANCELLED"]);
  });
  it("پایان‌یافته‌ها", () => {
    expect(next("CANCELLED")).toEqual([]);
    expect(next("RETURNED")).toEqual([]);
  });
});

describe("کد رهگیری", () => {
  it("لازم برای پست و تیپاکس", () => {
    expect(needsTrackingCode("POST")).toBe(true);
    expect(needsTrackingCode("COURIER")).toBe(false);
  });
  it("یکدست‌سازی و اعتبار", () => {
    expect(normalizeTrackingCode(" tpx 8820 41 ")).toBe("TPX882041");
    expect(normalizeTrackingCode("۱۲۳۴۵۶۷۸۹۰")).toBe("1234567890");
    expect(validTrackingCode("TPX882041")).toBe(true);
    expect(validTrackingCode("12")).toBe(false);
    expect(validTrackingCode("<script>")).toBe(false);
  });
});

describe("لغو و موجودی (D-039)", () => {
  it("پرداخت‌نشده: فقط آزادسازی رزرو؛ بقیه: برگشت به انبار", () => {
    expect(stockOnCancel({ status: "PENDING_PAYMENT", paymentMethod: "ONLINE" })).toBe(
      "release_reservation",
    );
    expect(stockOnCancel({ status: "PAID", paymentMethod: "ONLINE" })).toBe("return_to_stock");
    expect(stockOnCancel({ status: "PROCESSING", paymentMethod: "COD" })).toBe("return_to_stock");
  });
});

describe("بازپرداخت (D-038)", () => {
  it("سقف = پرداخت موفق − بازپرداخت قبلی", () => {
    expect(
      refundableAmount(
        [
          { status: "FAILED", amount: 100 },
          { status: "SUCCESS", amount: 1000 },
        ],
        [{ amount: 300 }],
      ),
    ).toBe(700);
    expect(refundableAmount([{ status: "PENDING", amount: 500 }], [])).toBe(0);
  });
  it("اعتبارسنجی", () => {
    expect(validateRefund(500, "REF-12345", 700)).toBe(null);
    expect(validateRefund(800, "REF-12345", 700)).toBe("too_much");
    expect(validateRefund(0, "REF-12345", 700)).toBe("amount");
    expect(validateRefund(1.5, "REF-12345", 700)).toBe("amount");
    expect(validateRefund(500, "ab", 700)).toBe("reference");
  });
  it("پیش‌فرض مرجوعی", () =>
    expect(
      defaultReturnRefund([
        { unitPrice: 4_250_000, quantity: 1 },
        { unitPrice: 950_000, quantity: 2 },
      ]),
    ).toBe(6_150_000));
});

describe("گردش مرجوعی (FR-RET-02)", () => {
  it("ترتیب مجاز", () => {
    expect(canMoveReturn("REQUESTED", "APPROVED")).toBe(true);
    expect(canMoveReturn("REQUESTED", "REFUNDED")).toBe(false);
    expect(canMoveReturn("APPROVED", "RECEIVED")).toBe(true);
    expect(canMoveReturn("RECEIVED", "EXCHANGED")).toBe(true);
    expect(canMoveReturn("REFUNDED", "REQUESTED")).toBe(false);
  });
});
