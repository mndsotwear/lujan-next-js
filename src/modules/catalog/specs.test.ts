import { describe, expect, it } from "vitest";
import { SPEC_SCHEMAS, validateSpecs } from "./specs";

describe("validateSpecs", () => {
  it("مشخصات کامل قهوه معتبر است", () => {
    expect(
      validateSpecs(SPEC_SCHEMAS.coffee, {
        kind: "mix3in1",
        netWeightG: 360,
        servings: 20,
        decaf: false,
      }),
    ).toEqual([]);
  });
  it("الزامی، ناشناخته و مقدار اشتباه گزارش می‌شود", () => {
    expect(validateSpecs(SPEC_SCHEMAS.coffee, {})).toContain("«نوع قهوه» الزامی است");
    const errs = validateSpecs(SPEC_SCHEMAS.coffee, {
      kind: "solar",
      color: "red",
      netWeightG: -5,
    });
    expect(errs).toContain("مشخصه‌ی ناشناخته: color");
    expect(errs).toContain("«نوع قهوه» مقدار نامعتبر دارد: solar");
    expect(errs).toContain("«وزن خالص» باید عدد نامنفی باشد");
  });
});

describe("formatSpecValue", () => {
  it("برچسب، واحد و بله/خیر", async () => {
    const { formatSpecValue } = await import("./specs");
    const [kind, weight, , decaf] = SPEC_SCHEMAS.coffee;
    expect(formatSpecValue(kind!, "mix3in1")).toBe("۳ در ۱");
    expect(formatSpecValue(weight!, 360)).toBe("۳۶۰ گرم");
    expect(formatSpecValue(decaf!, false)).toBe("ندارد");
    expect(formatSpecValue(kind!, undefined)).toBeNull();
  });
});

describe("specChips", () => {
  it("بله‌ها با برچسب، خیرها حذف، حداکثر سه", async () => {
    const { specChips } = await import("./specs");
    expect(
      specChips(SPEC_SCHEMAS.coffee, { kind: "mix3in1", netWeightG: 360, decaf: true }),
    ).toEqual(["۳ در ۱", "۳۶۰ گرم", "بدون کافئین"]);
    expect(specChips(SPEC_SCHEMAS.coffee, { decaf: true })).toEqual(["بدون کافئین"]);
    expect(specChips(SPEC_SCHEMAS.coffee, { decaf: false })).toEqual([]);
    expect(
      specChips(SPEC_SCHEMAS.coffee, { kind: "pure", netWeightG: 200, servings: 100, decaf: true }),
    ).toHaveLength(3);
  });
});
