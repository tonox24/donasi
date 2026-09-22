-- CreateEnum
CREATE TYPE "QurbanAnimalType" AS ENUM (
    'GOAT',
    'SHEEP',
    'COW'
);

-- CreateEnum
CREATE TYPE "QurbanPackageStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'INACTIVE',
    'SOLD_OUT',
    'COMPLETED'
);

-- CreateEnum
CREATE TYPE "QurbanOrderStatus" AS ENUM (
    'PENDING_PAYMENT',
    'PAID',
    'CONFIRMED',
    'IN_PROCESS',
    'COMPLETED',
    'CANCELLED',
    'REFUNDED'
);

-- CreateEnum
CREATE TYPE "QurbanSavingStatus" AS ENUM (
    'ACTIVE',
    'ON_TRACK',
    'COMPLETED',
    'QURBAN_EXECUTED',
    'OVERDUE',
    'PAUSED',
    'CANCELLED',
    'REFUNDED'
);

-- CreateEnum
CREATE TYPE "QurbanContributionStatus" AS ENUM (
    'PENDING',
    'PAID',
    'FAILED',
    'EXPIRED',
    'CANCELLED',
    'REFUNDED'
);

-- CreateEnum
CREATE TYPE "QurbanAnimalStatus" AS ENUM (
    'REGISTERED',
    'VERIFIED',
    'SLAUGHTERED',
    'PROCESSED',
    'DISTRIBUTED',
    'CANCELLED'
);

-- CreateEnum
CREATE TYPE "QurbanDocumentationType" AS ENUM (
    'BEFORE_SLAUGHTER',
    'SLAUGHTER',
    'AFTER_SLAUGHTER',
    'DISTRIBUTION',
    'OTHER'
);

-- CreateEnum
CREATE TYPE "QurbanDistributionStatus" AS ENUM (
    'DRAFT',
    'READY',
    'DISTRIBUTED',
    'CANCELLED'
);

-- CreateEnum
CREATE TYPE "QurbanSavingFrequency" AS ENUM (
    'DAILY',
    'WEEKLY',
    'MONTHLY',
    'CUSTOM'
);


-- CreateTable
CREATE TABLE "QurbanPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "animalType" "QurbanAnimalType" NOT NULL,
    "shareCount" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "qurbanYear" INTEGER NOT NULL,
    "distributionLocation" TEXT,
    "quantityAvailable" INTEGER NOT NULL DEFAULT 0,
    "quantitySold" INTEGER NOT NULL DEFAULT 0,
    "status" "QurbanPackageStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QurbanPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QurbanSavingPlan" (
    "id" TEXT NOT NULL,
    "savingNumber" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "qurbanAnimalType" "QurbanAnimalType" NOT NULL,
    "targetAmount" DECIMAL(18,2) NOT NULL,
    "currentAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "remainingAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "contributionAmount" DECIMAL(18,2),
    "frequency" "QurbanSavingFrequency" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "status" "QurbanSavingStatus" NOT NULL DEFAULT 'ACTIVE',
    "distributionLocation" TEXT,
    "pekurbanName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QurbanSavingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QurbanSavingContribution" (
    "id" TEXT NOT NULL,
    "contributionNumber" TEXT NOT NULL,
    "savingPlanId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "status" "QurbanContributionStatus" NOT NULL DEFAULT 'PENDING',
    "contributionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentReference" TEXT,
    "paymentMethod" TEXT,
    "providerTransactionId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QurbanSavingContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QurbanOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "qurbanPackageId" TEXT NOT NULL,
    "savingPlanId" TEXT,
    "animalType" "QurbanAnimalType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "shareCount" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "qurbanYear" INTEGER NOT NULL,
    "pekurbanName" TEXT NOT NULL,
    "donorName" TEXT NOT NULL,
    "donorEmail" TEXT,
    "donorPhone" TEXT,
    "distributionLocation" TEXT,
    "status" "QurbanOrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "notes" TEXT,
    "certificateNumber" TEXT,
    "certificateUrl" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QurbanOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QurbanAnimal" (
    "id" TEXT NOT NULL,
    "animalCode" TEXT NOT NULL,
    "qurbanOrderId" TEXT NOT NULL,
    "animalType" "QurbanAnimalType" NOT NULL,
    "ageMonths" INTEGER,
    "weightKg" DECIMAL(10,2),
    "sex" TEXT,
    "healthStatus" TEXT,
    "location" TEXT,
    "status" "QurbanAnimalStatus" NOT NULL DEFAULT 'REGISTERED',
    "verifiedAt" TIMESTAMP(3),
    "slaughteredAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "distributedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QurbanAnimal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QurbanDocumentation" (
    "id" TEXT NOT NULL,
    "qurbanOrderId" TEXT NOT NULL,
    "qurbanAnimalId" TEXT,
    "type" "QurbanDocumentationType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "title" TEXT,
    "caption" TEXT,
    "takenAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QurbanDocumentation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QurbanDistribution" (
    "id" TEXT NOT NULL,
    "distributionNumber" TEXT NOT NULL,
    "qurbanOrderId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "distributionDate" TIMESTAMP(3),
    "packageQuantity" INTEGER NOT NULL DEFAULT 0,
    "beneficiaryCount" INTEGER NOT NULL DEFAULT 0,
    "status" "QurbanDistributionStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QurbanDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QurbanDistributionBeneficiary" (
    "id" TEXT NOT NULL,
    "distributionId" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "packageQuantity" INTEGER NOT NULL DEFAULT 1,
    "receivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QurbanDistributionBeneficiary_pkey" PRIMARY KEY ("id")
);


-- CreateIndex
CREATE UNIQUE INDEX "QurbanPackage_slug_key"
ON "QurbanPackage"("slug");

CREATE INDEX "QurbanPackage_animalType_idx"
ON "QurbanPackage"("animalType");

CREATE INDEX "QurbanPackage_qurbanYear_idx"
ON "QurbanPackage"("qurbanYear");

CREATE INDEX "QurbanPackage_status_idx"
ON "QurbanPackage"("status");

CREATE INDEX "QurbanPackage_createdById_idx"
ON "QurbanPackage"("createdById");


CREATE UNIQUE INDEX "QurbanSavingPlan_savingNumber_key"
ON "QurbanSavingPlan"("savingNumber");

CREATE INDEX "QurbanSavingPlan_donorId_idx"
ON "QurbanSavingPlan"("donorId");

CREATE INDEX "QurbanSavingPlan_status_idx"
ON "QurbanSavingPlan"("status");

CREATE INDEX "QurbanSavingPlan_qurbanAnimalType_idx"
ON "QurbanSavingPlan"("qurbanAnimalType");

CREATE INDEX "QurbanSavingPlan_targetDate_idx"
ON "QurbanSavingPlan"("targetDate");


CREATE UNIQUE INDEX "QurbanSavingContribution_contributionNumber_key"
ON "QurbanSavingContribution"("contributionNumber");

CREATE INDEX "QurbanSavingContribution_savingPlanId_idx"
ON "QurbanSavingContribution"("savingPlanId");

CREATE INDEX "QurbanSavingContribution_status_idx"
ON "QurbanSavingContribution"("status");

CREATE INDEX "QurbanSavingContribution_contributionDate_idx"
ON "QurbanSavingContribution"("contributionDate");

CREATE INDEX "QurbanSavingContribution_providerTransactionId_idx"
ON "QurbanSavingContribution"("providerTransactionId");


CREATE UNIQUE INDEX "QurbanOrder_orderNumber_key"
ON "QurbanOrder"("orderNumber");

CREATE INDEX "QurbanOrder_donorId_idx"
ON "QurbanOrder"("donorId");

CREATE INDEX "QurbanOrder_qurbanPackageId_idx"
ON "QurbanOrder"("qurbanPackageId");

CREATE INDEX "QurbanOrder_savingPlanId_idx"
ON "QurbanOrder"("savingPlanId");

CREATE INDEX "QurbanOrder_status_idx"
ON "QurbanOrder"("status");

CREATE INDEX "QurbanOrder_qurbanYear_idx"
ON "QurbanOrder"("qurbanYear");

CREATE INDEX "QurbanOrder_createdAt_idx"
ON "QurbanOrder"("createdAt");


CREATE UNIQUE INDEX "QurbanAnimal_animalCode_key"
ON "QurbanAnimal"("animalCode");

CREATE INDEX "QurbanAnimal_qurbanOrderId_idx"
ON "QurbanAnimal"("qurbanOrderId");

CREATE INDEX "QurbanAnimal_animalType_idx"
ON "QurbanAnimal"("animalType");

CREATE INDEX "QurbanAnimal_status_idx"
ON "QurbanAnimal"("status");

CREATE INDEX "QurbanAnimal_createdById_idx"
ON "QurbanAnimal"("createdById");


CREATE INDEX "QurbanDocumentation_qurbanOrderId_idx"
ON "QurbanDocumentation"("qurbanOrderId");

CREATE INDEX "QurbanDocumentation_qurbanAnimalId_idx"
ON "QurbanDocumentation"("qurbanAnimalId");

CREATE INDEX "QurbanDocumentation_type_idx"
ON "QurbanDocumentation"("type");

CREATE INDEX "QurbanDocumentation_createdAt_idx"
ON "QurbanDocumentation"("createdAt");


CREATE UNIQUE INDEX "QurbanDistribution_distributionNumber_key"
ON "QurbanDistribution"("distributionNumber");

CREATE INDEX "QurbanDistribution_qurbanOrderId_idx"
ON "QurbanDistribution"("qurbanOrderId");

CREATE INDEX "QurbanDistribution_status_idx"
ON "QurbanDistribution"("status");

CREATE INDEX "QurbanDistribution_distributionDate_idx"
ON "QurbanDistribution"("distributionDate");

CREATE INDEX "QurbanDistribution_location_idx"
ON "QurbanDistribution"("location");

CREATE INDEX "QurbanDistribution_createdById_idx"
ON "QurbanDistribution"("createdById");


CREATE UNIQUE INDEX "QurbanDistributionBeneficiary_distributionId_beneficiaryId_key"
ON "QurbanDistributionBeneficiary"("distributionId", "beneficiaryId");

CREATE INDEX "QurbanDistributionBeneficiary_distributionId_idx"
ON "QurbanDistributionBeneficiary"("distributionId");

CREATE INDEX "QurbanDistributionBeneficiary_beneficiaryId_idx"
ON "QurbanDistributionBeneficiary"("beneficiaryId");


-- AddForeignKey
ALTER TABLE "QurbanPackage"
ADD CONSTRAINT "QurbanPackage_createdById_fkey"
FOREIGN KEY ("createdById")
REFERENCES "User"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QurbanSavingPlan"
ADD CONSTRAINT "QurbanSavingPlan_donorId_fkey"
FOREIGN KEY ("donorId")
REFERENCES "DonorProfile"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QurbanSavingContribution"
ADD CONSTRAINT "QurbanSavingContribution_savingPlanId_fkey"
FOREIGN KEY ("savingPlanId")
REFERENCES "QurbanSavingPlan"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QurbanOrder"
ADD CONSTRAINT "QurbanOrder_donorId_fkey"
FOREIGN KEY ("donorId")
REFERENCES "DonorProfile"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QurbanOrder"
ADD CONSTRAINT "QurbanOrder_qurbanPackageId_fkey"
FOREIGN KEY ("qurbanPackageId")
REFERENCES "QurbanPackage"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QurbanOrder"
ADD CONSTRAINT "QurbanOrder_savingPlanId_fkey"
FOREIGN KEY ("savingPlanId")
REFERENCES "QurbanSavingPlan"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QurbanAnimal"
ADD CONSTRAINT "QurbanAnimal_qurbanOrderId_fkey"
FOREIGN KEY ("qurbanOrderId")
REFERENCES "QurbanOrder"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QurbanAnimal"
ADD CONSTRAINT "QurbanAnimal_createdById_fkey"
FOREIGN KEY ("createdById")
REFERENCES "User"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QurbanDocumentation"
ADD CONSTRAINT "QurbanDocumentation_qurbanOrderId_fkey"
FOREIGN KEY ("qurbanOrderId")
REFERENCES "QurbanOrder"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QurbanDocumentation"
ADD CONSTRAINT "QurbanDocumentation_qurbanAnimalId_fkey"
FOREIGN KEY ("qurbanAnimalId")
REFERENCES "QurbanAnimal"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QurbanDocumentation"
ADD CONSTRAINT "QurbanDocumentation_createdById_fkey"
FOREIGN KEY ("createdById")
REFERENCES "User"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QurbanDistribution"
ADD CONSTRAINT "QurbanDistribution_qurbanOrderId_fkey"
FOREIGN KEY ("qurbanOrderId")
REFERENCES "QurbanOrder"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QurbanDistribution"
ADD CONSTRAINT "QurbanDistribution_createdById_fkey"
FOREIGN KEY ("createdById")
REFERENCES "User"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QurbanDistributionBeneficiary"
ADD CONSTRAINT "QurbanDistributionBeneficiary_distributionId_fkey"
FOREIGN KEY ("distributionId")
REFERENCES "QurbanDistribution"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QurbanDistributionBeneficiary"
ADD CONSTRAINT "QurbanDistributionBeneficiary_beneficiaryId_fkey"
FOREIGN KEY ("beneficiaryId")
REFERENCES "Beneficiary"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
