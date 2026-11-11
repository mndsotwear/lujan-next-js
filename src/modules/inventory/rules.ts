/**
 * اصلاح دستی موجودی و هشدار کم‌موجودی (FR-INV-03, FR-INV-04، D-043) — منطق خالص.
 */
export const ADJUST_REASONS = ["PURCHASE", "SALE_STORE", "ADJUSTMENT", "DAMAGE", "RETURN"] as const;
export type AdjustReason = (typeof ADJUST_REASONS)[number];

type Inv = {
  onHand: number;
  reserved: number;
  safetyStock: number;
  lowStockThreshold: number;
};

export type AdjustError = "delta" | "reason" | "negative" | "note";

/** خروج بیشتر از موجودی آزاد (فیزیکی − رزرو) مجاز نیست؛ «اصلاح» و «آسیب» توضیح لازم دارند */
export function validateAdjustment(
  delta: number,
  reason: string,
  note: string,
  inv: { onHand: number; reserved: number },
): AdjustError | null {
  if (!Number.isSafeInteger(delta) || delta === 0 || Math.abs(delta) > 100_000) return "delta";
  if (!(ADJUST_REASONS as readonly string[]).includes(reason)) return "reason";
  if (inv.onHand + delta < inv.reserved) return "negative";
  if ((reason === "ADJUSTMENT" || reason === "DAMAGE") && note.trim().length < 3) return "note";
  return null;
}

/** ورود کالا با دلیل «خرید» یا «مرجوعی» مثبت است؛ «فروش حضوری» و «آسیب» منفی */
export function signedDelta(reason: AdjustReason, qty: number): number {
  return reason === "SALE_STORE" || reason === "DAMAGE"
    ? -Math.abs(qty)
    : reason === "ADJUSTMENT"
      ? qty
      : Math.abs(qty);
}

export const isLowStock = (i: Inv) =>
  Math.max(0, i.onHand - i.reserved - i.safetyStock) <= i.lowStockThreshold;

/** کدام‌ها پیامک تازه می‌خواهند و نشانِ کدام‌ها باید پاک شود (D-043) */
export function lowStockChanges<T extends Inv & { id: string; lowStockNotifiedAt: Date | null }>(
  rows: T[],
): { notify: T[]; clear: string[] } {
  return {
    notify: rows.filter((r) => isLowStock(r) && !r.lowStockNotifiedAt),
    clear: rows.filter((r) => !isLowStock(r) && r.lowStockNotifiedAt).map((r) => r.id),
  };
}

/** از ناموجود به موجود: وقت پیامک «موجود شد» (FR-CAT-04) */
export const becameAvailable = (before: Inv, after: Inv) =>
  Math.max(0, before.onHand - before.reserved - before.safetyStock) === 0 &&
  Math.max(0, after.onHand - after.reserved - after.safetyStock) > 0;
