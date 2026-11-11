import { describe, expect, it } from "vitest";
import { addRating, validQuestion, validReview } from "./feedback";

describe("پرسش و نظر (FR-CAT-06، D-040)", () => {
  it("طول پرسش", () => {
    expect(validQuestion("کوتاه")).toBe(false);
    expect(validQuestion("آیا این ماشین با تیغه‌ی مدل ۶۰۰ سازگار است؟")).toBe(true);
    expect(validQuestion("x".repeat(501))).toBe(false);
  });
  it("امتیاز ۱ تا ۵", () => {
    expect(validReview(5, "")).toBe(true);
    expect(validReview(0, "")).toBe(false);
    expect(validReview(4.5, "")).toBe(false);
    expect(validReview(3, "x".repeat(1001))).toBe(false);
  });
  it("میانگین تازه بدون از دست رفتن امتیازهای قبلی", () => {
    expect(addRating(4.5, 10, 1)).toEqual({ ratingAvg: 4.18, ratingCount: 11 });
    expect(addRating(0, 0, 5)).toEqual({ ratingAvg: 5, ratingCount: 1 });
  });
});
