-- M1.8: ابعاد بسته (FR-SHP-02، D-029)، زمان تحویل و جزئیات مرجوعی (FR-RET-01، D-030)

-- CreateEnum
CREATE TYPE "ReturnReason" AS ENUM ('DEFECTIVE', 'WRONG_ITEM', 'DAMAGED', 'NOT_AS_DESCRIBED', 'CHANGED_MIND');

-- CreateEnum
CREATE TYPE "ReturnType" AS ENUM ('REFUND', 'EXCHANGE');

-- AlterTable
ALTER TABLE "Variant" ADD COLUMN     "heightCm" INTEGER,
ADD COLUMN     "lengthCm" INTEGER,
ADD COLUMN     "widthCm" INTEGER;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveredAt" TIMESTAMP(3);

-- AlterTable (جدول مرجوعی تا این مرحله خالی است)
ALTER TABLE "ReturnRequest" ADD COLUMN     "reasonCode" "ReturnReason" NOT NULL,
ADD COLUMN     "resolutionNote" TEXT,
ADD COLUMN     "type" "ReturnType" NOT NULL;

-- CreateIndex
CREATE INDEX "ReturnRequest_orderId_idx" ON "ReturnRequest"("orderId");
