/** ساعات کاری فروشگاه حضوری (FR-INV-06) — منطق خالص */
export type HoursRow = { days: number[]; open: string; close: string };

/** روز هفته‌ی ایرانی: ۰ = شنبه … ۶ = جمعه، و دقیقه از نیمه‌شب، به وقت تهران */
export function tehranNow(now = new Date()): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const order = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
  return {
    day: order.indexOf(get("weekday")),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

const toMin = (hhmm: string) => {
  const [h = "0", m = "0"] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
};

export function isOpenAt(hours: HoursRow[], at: { day: number; minutes: number }): boolean {
  return hours.some(
    (r) => r.days.includes(at.day) && at.minutes >= toMin(r.open) && at.minutes < toMin(r.close),
  );
}

/** پیوندهای مسیریابی (بدون قاب نقشه؛ CSP قاب را می‌بندد و نقشه‌ی گوگل در ایران ناپایدار است) */
export function mapLinks(geo: { lat: number; lng: number }) {
  const { lat, lng } = geo;
  return {
    neshan: `https://neshan.org/maps/@${lat},${lng},17z,0p`,
    balad: `https://balad.ir/location?latitude=${lat}&longitude=${lng}&zoom=17`,
    google: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
  };
}
