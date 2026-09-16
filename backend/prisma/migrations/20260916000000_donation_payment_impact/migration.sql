-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM (
    'PENDING',
    'PAID',
    'FAILED',
    'EXPIRED',
    'CANCELLED',
    'REFUNDED'
);

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM (
    'INITIATED',
    'PENDING',
    'PAID',
    'FAILED',
    'EXPIRED',
    'CANCELLED',
    'REFUNDED'
);

-- CreateTable
CREATE TABLE "DonorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DonorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "donorId" TEXT,
    "campaignId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "donorName" TEXT NOT NULL,
    "donorEmail" TEXT,
    "donorPhone" TEXT,
    "message" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "status" "DonationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "donationId" TEXT NOT NULL,
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

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignImpact" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "amountPerUnit" DECIMAL(18,2) NOT NULL,
    "targetQuantity" DECIMAL(18,2),
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignImpact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonationImpact" (
    "id" TEXT NOT NULL,
    "donationId" TEXT NOT NULL,
    "campaignImpactId" TEXT NOT NULL,
    "quantity" DECIMAL(18,2) NOT NULL,
    "amountAllocated" DECIMAL(18,2) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DonationImpact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DonorProfile_userId_key"
ON "DonorProfile"("userId");

CREATE INDEX "DonorProfile_email_idx"
ON "DonorProfile"("email");

CREATE INDEX "DonorProfile_phone_idx"
ON "DonorProfile"("phone");

CREATE INDEX "Donation_donorId_idx"
ON "Donation"("donorId");

CREATE INDEX "Donation_campaignId_idx"
ON "Donation"("campaignId");

CREATE INDEX "Donation_status_idx"
ON "Donation"("status");

CREATE INDEX "Donation_createdAt_idx"
ON "Donation"("createdAt");

CREATE INDEX "Donation_donorEmail_idx"
ON "Donation"("donorEmail");

CREATE INDEX "Donation_donorPhone_idx"
ON "Donation"("donorPhone");

CREATE UNIQUE INDEX "PaymentTransaction_transactionReference_key"
ON "PaymentTransaction"("transactionReference");

CREATE INDEX "PaymentTransaction_donationId_idx"
ON "PaymentTransaction"("donationId");

CREATE INDEX "PaymentTransaction_provider_idx"
ON "PaymentTransaction"("provider");

CREATE INDEX "PaymentTransaction_status_idx"
ON "PaymentTransaction"("status");

CREATE INDEX "PaymentTransaction_providerTransactionId_idx"
ON "PaymentTransaction"("providerTransactionId");

CREATE INDEX "PaymentTransaction_createdAt_idx"
ON "PaymentTransaction"("createdAt");

CREATE INDEX "CampaignImpact_campaignId_idx"
ON "CampaignImpact"("campaignId");

CREATE INDEX "CampaignImpact_campaignId_isActive_idx"
ON "CampaignImpact"("campaignId", "isActive");

CREATE INDEX "CampaignImpact_displayOrder_idx"
ON "CampaignImpact"("displayOrder");

CREATE INDEX "DonationImpact_donationId_idx"
ON "DonationImpact"("donationId");

CREATE INDEX "DonationImpact_campaignImpactId_idx"
ON "DonationImpact"("campaignImpactId");

-- AddForeignKey
ALTER TABLE "DonorProfile"
ADD CONSTRAINT "DonorProfile_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "Donation"
ADD CONSTRAINT "Donation_donorId_fkey"
FOREIGN KEY ("donorId")
REFERENCES "DonorProfile"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "Donation"
ADD CONSTRAINT "Donation_campaignId_fkey"
FOREIGN KEY ("campaignId")
REFERENCES "Campaign"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "PaymentTransaction"
ADD CONSTRAINT "PaymentTransaction_donationId_fkey"
FOREIGN KEY ("donationId")
REFERENCES "Donation"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "CampaignImpact"
ADD CONSTRAINT "CampaignImpact_campaignId_fkey"
FOREIGN KEY ("campaignId")
REFERENCES "Campaign"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "DonationImpact"
ADD CONSTRAINT "DonationImpact_donationId_fkey"
FOREIGN KEY ("donationId")
REFERENCES "Donation"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "DonationImpact"
ADD CONSTRAINT "DonationImpact_campaignImpactId_fkey"
FOREIGN KEY ("campaignImpactId")
REFERENCES "CampaignImpact"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
