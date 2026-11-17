import { describe, expect, it } from "vitest";
import { reminderText, shouldRemind, tehranHour } from "./abandoned";

// ۱۲:۰۰ UTC = ۱۵:۳۰ تهران
const now = new Date("2026-11-12T12:00:00Z");
const base = {
  hasUser: true,
  itemCount: 2,
  lastActivity: new Date("2026-11-12T08:00:00Z"), // ۴ ساعت پیش
  remindedAt: null,
  orderedSince: false,
};

describe("سبد رهاشده", () => {
  it("وقت تهران", () => {
    expect(tehranHour(now)).toBe(15);
  });
  it("۳ ساعت بعد، یک بار، فقط با کاربر و کالا", () => {
    expect(shouldRemind(base, now)).toBe(true);
    expect(shouldRemind({ ...base, hasUser: false }, now)).toBe(false);
    expect(shouldRemind({ ...base, itemCount: 0 }, now)).toBe(false);
    expect(shouldRemind({ ...base, orderedSince: true }, now)).toBe(false);
    expect(shouldRemind({ ...base, lastActivity: new Date("2026-11-12T10:00:00Z") }, now)).toBe(
      false,
    );
    expect(shouldRemind({ ...base, lastActivity: new Date("2026-11-09T10:00:00Z") }, now)).toBe(
      false,
    );
    expect(shouldRemind({ ...base, remindedAt: new Date("2026-11-12T11:30:00Z") }, now)).toBe(
      false,
    );
  });
  it("کالای تازه پس از یادآوری = یادآوری دوباره مجاز", () => {
    expect(shouldRemind({ ...base, remindedAt: new Date("2026-11-12T07:00:00Z") }, now)).toBe(true);
  });
  it("شب پیامک نمی‌رود", () => {
    // ۱۹:۰۰ UTC = ۲۲:۳۰ تهران
    const night = new Date("2026-11-12T19:00:00Z");
    expect(shouldRemind({ ...base, lastActivity: new Date("2026-11-12T15:00:00Z") }, night)).toBe(
      false,
    );
  });
  it("متن پیامک", () => {
    expect(reminderText("لوجان", "https://lujan.ir", "علی")).toContain("https://lujan.ir/cart");
  });
});
