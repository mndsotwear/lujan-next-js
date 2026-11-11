-- بازپرداخت به شبای مشتری (D-041) — مقدارها رمزنگاری‌شده ذخیره می‌شوند

-- AlterTable
ALTER TABLE "ReturnRequest" ADD COLUMN     "refundIban" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "refundIban" TEXT;
