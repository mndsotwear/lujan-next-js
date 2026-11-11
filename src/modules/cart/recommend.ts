/**
 * پیشنهاد مکمل در سبد (FR-REC-01, 02 بخش قوانین, 03, 06) — فاز ۱: فقط قوانین دستی مدیر.
 * قوانین کسب‌وکار: فقط کالای موجود، نه چیزی که در سبد هست، احترام به «هرگز پیشنهاد نده»، حداکثر ۴.
 * در فاز ۲ (M2.2) هم‌خریدی و شباهت معنایی به همین تابع اضافه می‌شود.
 */
import type { Recommendation } from "./types";

export type RuleRow = {
  sourceProductId: string;
  targetProductId: string;
  type: "COMPLEMENT" | "ALTERNATIVE" | "EXCLUDE";
  priority: number;
  reasonLabel: string | null;
};

export type Candidate = Omit<Recommendation, "reason" | "unlocksFreeShipping"> & {
  inStock: boolean;
};

export function pickRecommendations(opts: {
  cartProductIds: string[];
  rules: RuleRow[];
  candidates: Map<string, Candidate>;
  freeShippingGap: number;
  max: number;
  defaultReason: string;
}): Recommendation[] {
  const inCart = new Set(opts.cartProductIds);
  const excluded = new Set(
    opts.rules
      .filter((r) => r.type === "EXCLUDE" && inCart.has(r.sourceProductId))
      .map((r) => r.targetProductId),
  );
  const seen = new Set<string>();
  const out: Recommendation[] = [];
  const rules = opts.rules
    .filter((r) => r.type === "COMPLEMENT" && inCart.has(r.sourceProductId))
    .sort((a, b) => b.priority - a.priority);
  for (const r of rules) {
    const c = opts.candidates.get(r.targetProductId);
    if (
      !c ||
      !c.inStock ||
      inCart.has(c.productId) ||
      excluded.has(c.productId) ||
      seen.has(c.productId)
    )
      continue;
    seen.add(c.productId);
    out.push({
      productId: c.productId,
      slug: c.slug,
      name: c.name,
      icon: c.icon,
      variantId: c.variantId,
      price: c.price,
      reason: r.reasonLabel ?? opts.defaultReason,
      unlocksFreeShipping: opts.freeShippingGap > 0 && c.price >= opts.freeShippingGap,
    });
  }
  // پیشنهاد پله‌ای: اگر چیزی ارسال را رایگان می‌کند، ارزان‌ترینِ آن‌ها اول بیاید (FR-REC-06)
  const unlockers = out.filter((r) => r.unlocksFreeShipping).sort((a, b) => a.price - b.price);
  const first = unlockers[0];
  const ordered = first ? [first, ...out.filter((r) => r !== first)] : out;
  return ordered.slice(0, opts.max);
}
