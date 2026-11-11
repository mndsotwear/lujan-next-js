-- M1.9b: لغو سفارش فقط با تأیید مدیر کل (D-039 اصلاح‌شده)

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelRequestedAt" TIMESTAMP(3),
ADD COLUMN     "cancelRequestedBy" TEXT;
