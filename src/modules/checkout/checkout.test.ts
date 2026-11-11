import { describe, expect, it } from "vitest";
import { canTransition, codAllowed, makePickupCode, reservationExpired } from "./rules";

describe("codAllowed (D-024)", () => {
  it("فقط آبادان با پیک یا حضوری و تا ۱۰ میلیون", () => {
    expect(codAllowed("COURIER", "آبادان", 9_000_000)).toBe(true);
    expect(codAllowed("PICKUP", null, 10_000_000)).toBe(true);
    expect(codAllowed("PICKUP", null, 10_000_001)).toBe(false);
    expect(codAllowed("TIPAX", "آبادان", 1_000_000)).toBe(false);
    expect(codAllowed("COURIER", "تهران", 1_000_000)).toBe(false);
  });
});

describe("order status", () => {
  it("گذارهای مجاز", () => {
    expect(canTransition("PENDING_PAYMENT", "PAID")).toBe(true);
    expect(canTransition("PAID", "DELIVERED")).toBe(false);
    expect(canTransition("CANCELLED", "PAID")).toBe(false);
  });
  it("انقضای رزرو و کد تحویل", () => {
    const now = new Date("2026-11-03T12:00:00Z");
    expect(reservationExpired(new Date("2026-11-03T11:59:59Z"), now)).toBe(true);
    expect(reservationExpired(new Date("2026-11-03T12:30:00Z"), now)).toBe(false);
    expect(reservationExpired(null, now)).toBe(false);
    expect(makePickupCode(() => 0)).toBe("100000");
    expect(makePickupCode(() => 0.999999)).toHaveLength(6);
  });
});
