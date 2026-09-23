-- CreateTable
CREATE TABLE "QurbanPaymentTransaction" (
    "id" TEXT NOT NULL,
    "qurbanSavingContributionId" TEXT,
    "qurbanOrderId" TEXT,
    "transactionReference" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "providerTransactionId" TEXT,
    "paidAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QurbanPaymentTransaction_pkey"
        PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QurbanPaymentTransaction_transactionReference_key"
ON "QurbanPaymentTransaction"("transactionReference");

CREATE INDEX "QurbanPaymentTransaction_qurbanSavingContributionId_idx"
ON "QurbanPaymentTransaction"("qurbanSavingContributionId");

CREATE INDEX "QurbanPaymentTransaction_qurbanOrderId_idx"
ON "QurbanPaymentTransaction"("qurbanOrderId");

CREATE INDEX "QurbanPaymentTransaction_provider_idx"
ON "QurbanPaymentTransaction"("provider");

CREATE INDEX "QurbanPaymentTransaction_status_idx"
ON "QurbanPaymentTransaction"("status");

CREATE INDEX "QurbanPaymentTransaction_providerTransactionId_idx"
ON "QurbanPaymentTransaction"("providerTransactionId");

CREATE INDEX "QurbanPaymentTransaction_createdAt_idx"
ON "QurbanPaymentTransaction"("createdAt");

-- Finance Ledger relation
ALTER TABLE "FinanceLedger"
ADD COLUMN "qurbanPaymentTransactionId" TEXT;

CREATE INDEX "FinanceLedger_qurbanPaymentTransactionId_idx"
ON "FinanceLedger"("qurbanPaymentTransactionId");

-- Foreign Keys
ALTER TABLE "QurbanPaymentTransaction"
ADD CONSTRAINT "QurbanPaymentTransaction_qurbanSavingContributionId_fkey"
FOREIGN KEY ("qurbanSavingContributionId")
REFERENCES "QurbanSavingContribution"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "QurbanPaymentTransaction"
ADD CONSTRAINT "QurbanPaymentTransaction_qurbanOrderId_fkey"
FOREIGN KEY ("qurbanOrderId")
REFERENCES "QurbanOrder"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "FinanceLedger"
ADD CONSTRAINT "FinanceLedger_qurbanPaymentTransactionId_fkey"
FOREIGN KEY ("qurbanPaymentTransactionId")
REFERENCES "QurbanPaymentTransaction"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
