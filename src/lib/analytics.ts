/**
 * رویدادهای آمار بازدید (FR-MKT-02، D-054) — Umami روی سرور خودمان.
 * بدون Umami (متغیرهای محیط خالی) هیچ کاری نمی‌کند. هیچ داده‌ی شخصی (نام، موبایل، آدرس) فرستاده نمی‌شود.
 */
export type AnalyticsEvent = "add_to_cart" | "begin_checkout" | "purchase" | "newsletter_signup";

type Umami = { track: (event: string, data?: Record<string, string | number>) => void };

export function track(event: AnalyticsEvent, data?: Record<string, string | number>): void {
  try {
    (window as unknown as { umami?: Umami }).umami?.track(event, data);
  } catch {
    // آمار نباید هرگز خرید را خراب کند
  }
}

/** یک‌بار برای هر کلید در همین مرورگر (مثلاً خرید هر سفارش) */
export function trackOnce(
  key: string,
  event: AnalyticsEvent,
  data?: Record<string, string | number>,
) {
  try {
    const k = `trk:${key}`;
    if (sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, "1");
  } catch {
    // بدون sessionStorage هم بفرست
  }
  track(event, data);
}
