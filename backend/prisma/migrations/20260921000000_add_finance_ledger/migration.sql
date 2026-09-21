-- CreateEnum
CREATE TYPE "FinanceLedgerType" AS ENUM ('INCOME', 'EXPENSE', 'REFUND', 'FEE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "FinanceLedgerStatus" AS ENUM ('POSTED', 'VOIDED');

-- AlterTable
ALTER TABLE "CampaignImpact"
ALTER COLUMN "targetQuantity" SET DATA TYPE DECIMAL(65,30);

-- CreateTable
CREATE TABLE "FinanceLedger" (
    "id" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "FinanceLedgerType" NOT NULL,
    "status" "FinanceLedgerStatus" NOT NULL DEFAULT 'POSTED',
    "reference" TEXT NOT NULL,
    "donationId" TEXT,
    "paymentTransactionId" TEXT,
    "receiptId" TEXT,
    "campaignId" TEXT,
    "description" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "metadata" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinanceLedger_reference_key"
ON "FinanceLedger"("reference");

-- CreateIndex
CREATE INDEX "FinanceLedger_transactionDate_idx"
ON "FinanceLedger"("transactionDate");

-- CreateIndex
CREATE INDEX "FinanceLedger_type_idx"
ON "FinanceLedger"("type");

-- CreateIndex
CREATE INDEX "FinanceLedger_status_idx"
ON "FinanceLedger"("status");

-- CreateIndex
CREATE INDEX "FinanceLedger_donationId_idx"
ON "FinanceLedger"("donationId");

-- CreateIndex
CREATE INDEX "FinanceLedger_paymentTransactionId_idx"
ON "FinanceLedger"("paymentTransactionId");

-- CreateIndex
CREATE INDEX "FinanceLedger_campaignId_idx"
ON "FinanceLedger"("campaignId");

-- CreateIndex
CREATE INDEX "DonorProfile_fullName_idx"
ON "DonorProfile"("fullName");

-- CreateIndex
CREATE INDEX "DonorProfile_createdAt_idx"
ON "DonorProfile"("createdAt");

-- AddForeignKey
ALTER TABLE "FinanceLedger"
ADD CONSTRAINT "FinanceLedger_donationId_fkey"
FOREIGN KEY ("donationId")
REFERENCES "Donation"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceLedger"
ADD CONSTRAINT "FinanceLedger_paymentTransactionId_fkey"
FOREIGN KEY ("paymentTransactionId")
REFERENCES "PaymentTransaction"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceLedger"
ADD CONSTRAINT "FinanceLedger_receiptId_fkey"
FOREIGN KEY ("receiptId")
REFERENCES "Receipt"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceLedger"
ADD CONSTRAINT "FinanceLedger_campaignId_fkey"
FOREIGN KEY ("campaignId")
REFERENCES "Campaign"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
