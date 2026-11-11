/**
 * تنظیمات فروشگاه — در M1.9 به پنل مدیریت منتقل می‌شود. هر تغییر یک تصمیم در لاگ تصمیم‌هاست.
 */
export const STORE = {
  /**
   * آستانه‌ی ارسال رایگان به تومان؛ null = ارسال رایگان نداریم (D-018، تصمیم مالک).
   * کد تخفیف نوع FREE_SHIPPING همچنان می‌تواند ارسال را رایگان کند.
   */
  freeShippingThreshold: null as number | null,
  /** حداکثر تعداد هر قلم در سبد مشتری عادی */
  maxQtyPerItem: 20,
  /** قیمت‌ها شامل مالیات بر ارزش افزوده‌اند (D-018) */
  pricesIncludeVat: true,
  /** حداکثر پیشنهاد در پنل سبد (FR-REC-01) */
  maxRecommendations: 4,
  /** فروشگاه حضوری (D-025) */
  storeLocation: { province: "خوزستان", city: "آبادان" },
  /**
   * نشانی، تلفن، ساعات و موقعیت فروشگاه حضوری (FR-INV-06، D-061) — مقدارها را مالک می‌دهد.
   * null = هنوز اعلام نشده؛ آن بخش در سایت نمایش داده نمی‌شود.
   * days: ۰ = شنبه … ۶ = جمعه. open/close به وقت تهران، "HH:MM".
   */
  storeInfo: {
    address: null as string | null,
    phone: null as string | null,
    /** موقعیت روی نقشه برای مسیریابی با نشان، بلد و گوگل */
    geo: null as { lat: number; lng: number } | null,
    hours: [] as { days: number[]; open: string; close: string }[],
  },
  /**
   * هزینه‌ی ارسال به تومان (D-026، D-029).
   * هزینه = base تا includedKg + perKg برای هر کیلوی اضافه؛ داخل استان فروشگاه sameProvinceDiscount کم می‌شود.
   * maxKg = سقف وزن روش (null یعنی بدون سقف).
   */
  shipping: {
    packagingGrams: 300,
    volumetricDivisor: 5000,
    methods: {
      PICKUP: {
        base: 0,
        includedKg: 0,
        perKg: 0,
        maxKg: null,
        sameProvinceDiscount: 0,
        eta: "همان روز، پس از پیامک آماده بودن",
      },
      COURIER: {
        base: 120_000,
        includedKg: 10,
        perKg: 10_000,
        maxKg: 25,
        sameProvinceDiscount: 0,
        eta: "فردا",
      },
      TIPAX: {
        base: 95_000,
        includedKg: 2,
        perKg: 20_000,
        maxKg: null,
        sameProvinceDiscount: 15_000,
        eta: "۲ تا ۳ روز کاری",
      },
      POST: {
        base: 70_000,
        includedKg: 1,
        perKg: 25_000,
        maxKg: 30,
        sameProvinceDiscount: 10_000,
        eta: "۳ تا ۵ روز کاری",
      },
    },
  },
  /**
   * صفحه‌ی رهگیری شرکت‌های حمل (D-032) — پیش از راه‌اندازی با مالک بررسی شود.
   * تا اتصال API، مشتری کد را می‌بیند و در سایت شرکت وارد می‌کند.
   */
  carrierTrackingPages: {
    POST: "https://tracking.post.ir/",
    TIPAX: "https://tipaxco.com/tracking",
  } as Partial<Record<"PICKUP" | "COURIER" | "TIPAX" | "POST", string>>,
  /** مرجوعی (D-030) */
  returns: { windowDays: 7, maxImages: 3, maxImageBytes: 4 * 1024 * 1024 },
  /** پرداخت در محل (D-024) */
  cod: { maxTotal: 10_000_000 },
  /** مهلت پرداخت و رزرو موجودی (FR-CHK-07، FR-CHK-08) */
  reservationMinutes: 30,
} as const;
