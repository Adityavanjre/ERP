-- Rollback: Remove Supplier GST Compliance Fields
-- Date: 2026-03-29

-- Step 1: Drop indexes
DROP INDEX IF EXISTS "Supplier_tenantId_name_idx";
DROP INDEX IF EXISTS "Supplier_tenantId_gstin_idx";

-- Step 2: Remove columns from Supplier
ALTER TABLE "Supplier" DROP COLUMN IF EXISTS "bankAccountName";
ALTER TABLE "Supplier" DROP COLUMN IF EXISTS "bankIfscCode";
ALTER TABLE "Supplier" DROP COLUMN IF EXISTS "bankAccountNumber";
ALTER TABLE "Supplier" DROP COLUMN IF EXISTS "taxRegime";
ALTER TABLE "Supplier" DROP COLUMN IF EXISTS "lastGstinVerifiedAt";
ALTER TABLE "Supplier" DROP COLUMN IF EXISTS "gstComplianceStatus";

-- Step 3: Drop enums
DROP TYPE IF EXISTS "TaxRegime";
DROP TYPE IF EXISTS "GstComplianceStatus";
