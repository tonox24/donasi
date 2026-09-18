/*
|--------------------------------------------------------------------------
| RECEIPT
|--------------------------------------------------------------------------
*/

CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "donationId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "donorName" TEXT NOT NULL,
    "donorEmail" TEXT,

    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',

    "campaignId" TEXT NOT NULL,
    "campaignTitle" TEXT NOT NULL,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Receipt_pkey"
        PRIMARY KEY ("id")
);


/*
|--------------------------------------------------------------------------
| RECEIPT SEQUENCE
|--------------------------------------------------------------------------
*/

CREATE TABLE "ReceiptSequence" (
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceiptSequence_pkey"
        PRIMARY KEY ("year")
);


/*
|--------------------------------------------------------------------------
| RECEIPT INDEXES
|--------------------------------------------------------------------------
*/

CREATE UNIQUE INDEX "Receipt_donationId_key"
ON "Receipt"("donationId");

CREATE UNIQUE INDEX "Receipt_receiptNumber_key"
ON "Receipt"("receiptNumber");

CREATE INDEX "Receipt_campaignId_idx"
ON "Receipt"("campaignId");

CREATE INDEX "Receipt_issuedAt_idx"
ON "Receipt"("issuedAt");

CREATE INDEX "Receipt_donorEmail_idx"
ON "Receipt"("donorEmail");


/*
|--------------------------------------------------------------------------
| RECEIPT FOREIGN KEY
|--------------------------------------------------------------------------
*/

ALTER TABLE "Receipt"
ADD CONSTRAINT "Receipt_donationId_fkey"
FOREIGN KEY ("donationId")
REFERENCES "Donation"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
