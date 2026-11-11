/**
 * پیامک خلاصه‌ی کم‌موجودی (FR-INV-04، D-043) — روزی یک بار صبح روی سرور اجرا شود:
 * npm run jobs:low-stock
 * فقط کالاهایی که از آخرین پیامک تازه کم‌موجود شده‌اند فرستاده می‌شوند.
 */
import "dotenv/config";
import { db } from "../src/lib/db";
import { sendLowStockDigest } from "../src/modules/inventory/notify";

sendLowStockDigest()
  .then((r) =>
    console.log(`✓ ${r.notified} کالای تازه کم‌موجود؛ ${r.cleared} کالا دوباره بالای آستانه.`),
  )
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
