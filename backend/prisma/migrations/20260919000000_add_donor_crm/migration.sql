-- CreateEnum
CREATE TYPE "DonorType" AS ENUM (
  'INDIVIDUAL',
  'CORPORATE',
  'COMMUNITY',
  'FOUNDATION',
  'INSTITUTION',
  'PARTNER',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "DonorStatus" AS ENUM (
  'ACTIVE',
  'INACTIVE',
  'BLOCKED'
);

-- AlterTable
ALTER TABLE "DonorProfile"
ADD COLUMN "donorType" "DonorType" NOT NULL DEFAULT 'INDIVIDUAL',
ADD COLUMN "status" "DonorStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "DonorProfile_donorType_idx"
ON "DonorProfile"("donorType");

-- CreateIndex
CREATE INDEX "DonorProfile_status_idx"
ON "DonorProfile"("status");
