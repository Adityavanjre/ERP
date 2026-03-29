-- Migration: Add Supplier GST Compliance Fields
-- Date: 2026-03-29
-- Description: Adds GST compliance tracking, tax regime, and bank details to Supplier model

-- Step 1: Create enums
CREATE TYPE "GstComplianceStatus" AS ENUM ('Pending', 'Verified', 'Invalid', 'Exempted');
CREATE TYPE "TaxRegime" AS ENUM ('Regular', 'Composition', 'Unregistered');

-- Step 2: Add columns to Supplier
ALTER TABLE "Supplier" ADD COLUMN "gstComplianceStatus" "GstComplianceStatus" NOT NULL DEFAULT 'Pending';
ALTER TABLE "Supplier" ADD COLUMN "lastGstinVerifiedAt" TIMESTAMP;
ALTER TABLE "Supplier" ADD COLUMN "taxRegime" "TaxRegime";
ALTER TABLE "Supplier" ADD COLUMN "bankAccountNumber" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "bankIfscCode" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "bankAccountName" TEXT;

-- Step 3: Add indexes for common query patterns
CREATE INDEX "Supplier_tenantId_gstin_idx" ON "Supplier"("tenantId", "gstin");
CREATE INDEX "Supplier_tenantId_name_idx" ON "Supplier"("tenantId", "name");
