-- CreateEnum
CREATE TYPE "QurbanPriceStatus" AS ENUM (
    'ESTIMATED',
    'FINALIZED',
    'ADJUSTED',
    'LOCKED'
);

-- AlterTable
ALTER TABLE "QurbanSavingPlan"
ADD COLUMN "estimatedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "recommendedTargetAmount" DECIMAL(18,2),
ADD COLUMN "finalAmount" DECIMAL(18,2),
ADD COLUMN "shortfallAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "excessAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "bufferPercentage" DECIMAL(5,2),
ADD COLUMN "priceStatus" "QurbanPriceStatus" NOT NULL DEFAULT 'ESTIMATED',
ADD COLUMN "priceFinalizedAt" TIMESTAMP(3),
ADD COLUMN "priceLockedAt" TIMESTAMP(3);

-- Backfill historical estimated price
UPDATE "QurbanSavingPlan"
SET "estimatedAmount" = "targetAmount";

-- CreateTable
CREATE TABLE "QurbanPriceAdjustment" (
    "id" TEXT NOT NULL,
    "savingPlanId" TEXT NOT NULL,
    "oldAmount" DECIMAL(18,2) NOT NULL,
    "newAmount" DECIMAL(18,2) NOT NULL,
    "difference" DECIMAL(18,2) NOT NULL,
    "percentage" DECIMAL(7,2),
    "reason" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QurbanPriceAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QurbanPriceAdjustment_savingPlanId_idx"
ON "QurbanPriceAdjustment"("savingPlanId");

-- CreateIndex
CREATE INDEX "QurbanPriceAdjustment_effectiveDate_idx"
ON "QurbanPriceAdjustment"("effectiveDate");

-- AddForeignKey
ALTER TABLE "QurbanPriceAdjustment"
ADD CONSTRAINT "QurbanPriceAdjustment_savingPlanId_fkey"
FOREIGN KEY ("savingPlanId")
REFERENCES "QurbanSavingPlan"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
