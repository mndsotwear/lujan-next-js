-- طعم‌های محصول برای «طعم‌یاب»
ALTER TABLE "Product" ADD COLUMN "flavors" TEXT[] DEFAULT ARRAY[]::TEXT[];
