-- M1.9c: پیامک روزانه‌ی کم‌موجودی فقط برای کالاهای تازه کم‌موجود (D-043)

-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "lowStockNotifiedAt" TIMESTAMP(3);
