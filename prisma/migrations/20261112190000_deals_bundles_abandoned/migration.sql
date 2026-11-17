-- پیشنهاد شگفت‌انگیز، بسته‌های ترکیبی و یادآوری سبد رهاشده
CREATE TABLE "FlashDeal" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "percent" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FlashDeal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FlashDeal_productId_idx" ON "FlashDeal"("productId");
CREATE INDEX "FlashDeal_endsAt_idx" ON "FlashDeal"("endsAt");
ALTER TABLE "FlashDeal" ADD CONSTRAINT "FlashDeal_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Bundle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "percent" INTEGER NOT NULL,
    "productIds" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Bundle_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Cart" ADD COLUMN "remindedAt" TIMESTAMP(3);
ALTER TABLE "CartItem" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
