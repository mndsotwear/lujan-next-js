/**
 * یکسان‌سازی متن فارسی برای جستجو (FR-SRCH-02):
 * ي→ی، ك→ک، ارقام فارسی/عربی→لاتین، حذف اعراب و کشیده، نیم‌فاصله و فاصله‌ها یکسان، حروف لاتین کوچک.
 */
const MAP: Record<string, string> = {
  ي: "ی",
  ى: "ی",
  ئ: "ی",
  ك: "ک",
  ة: "ه",
  ۀ: "ه",
  أ: "ا",
  إ: "ا",
  آ: "ا",
  ٱ: "ا",
  ؤ: "و",
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "") // اعراب و کشیده
    .replace(/[يىئكةۀأإآٱؤ۰-۹٠-٩]/g, (c) => MAP[c] ?? c)
    .replace(/[‌‍‎‏]/g, " ") // نیم‌فاصله ← فاصله
    .replace(/[^\p{L}\p{N}\s.]/gu, " ") // علائم
    .replace(/\s+/g, " ")
    .trim();
}

/** واژه‌ها؛ «قهوه‌فوری» و «قهوه فوری» هر دو به [قهوه، فوری] تبدیل می‌شوند. */
export function tokenize(text: string): string[] {
  return normalize(text).split(" ").filter(Boolean);
}

/** نسخه‌ی بدون فاصله برای تطبیق «ریشتراش» با «ریش تراش» */
export function compact(text: string): string {
  return normalize(text).replace(/\s/g, "");
}
