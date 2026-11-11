/**
 * آزادسازی رزرو سفارش‌هایی که مهلت پرداختشان گذشته (FR-CHK-07).
 * سایت این کار را در هر ثبت سفارش و هر نمایش سفارش هم انجام می‌دهد؛ این اسکریپت برای cron روی سرور است
 * (هر ۵ دقیقه: npm run jobs:release).
 */
import "dotenv/config";
import { db } from "../src/lib/db";
import { releaseExpiredReservations } from "../src/modules/checkout/orders";

releaseExpiredReservations()
  .then((n) => console.log(`✓ ${n} سفارش منقضی لغو و رزروشان آزاد شد.`))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
