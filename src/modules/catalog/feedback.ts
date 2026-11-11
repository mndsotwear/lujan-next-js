/** قواعد پرسش و نظر (FR-CAT-06، D-040) — منطق خالص */
export const validQuestion = (s: string) => {
  const t = s.trim();
  return t.length >= 10 && t.length <= 500;
};

export const validReview = (rating: number, body: string) =>
  Number.isInteger(rating) && rating >= 1 && rating <= 5 && body.trim().length <= 1000;

/** میانگین تازه با افزودن یک امتیاز (امتیازهای قبلی، از جمله داده‌ی نمونه، حفظ می‌شوند) */
export function addRating(avg: number, count: number, rating: number) {
  const n = count + 1;
  return { ratingAvg: Math.round(((avg * count + rating) / n) * 100) / 100, ratingCount: n };
}
