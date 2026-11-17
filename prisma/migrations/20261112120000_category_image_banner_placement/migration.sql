-- عکس دایره‌ی دسته در صفحه‌ی اصلی و جایگاه بنر (اسلایدر یا کارت‌های کنار آن)
ALTER TABLE "Category" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Banner" ADD COLUMN "placement" TEXT NOT NULL DEFAULT 'hero';
