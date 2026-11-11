-- M1.9e: قیمت خرید و سودآوری (D-050)

-- AlterTable
ALTER TABLE "Variant" ADD COLUMN     "costPrice" INTEGER;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "unitCost" INTEGER;
