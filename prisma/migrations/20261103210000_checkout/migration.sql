-- CreateIndex
CREATE UNIQUE INDEX "Payment_authority_key" ON "Payment"("authority");

-- شماره‌ی سفارش برای مشتری از ۱۰۰۱ شروع شود (فقط اگر هنوز سفارشی ثبت نشده)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Order") THEN
    ALTER SEQUENCE "Order_number_seq" RESTART WITH 1001;
  END IF;
END $$;
