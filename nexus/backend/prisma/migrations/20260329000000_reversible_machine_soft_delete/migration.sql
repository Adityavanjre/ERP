-- AlterTable: Add soft-delete fields and updatedAt to Machine
ALTER TABLE "Machine" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Machine" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Machine" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Machine_tenantId_isDeleted_idx" ON "Machine"("tenantId", "isDeleted");

-- Backfill updatedAt from createdAt for existing rows
UPDATE "Machine" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NOT NULL;

-- === ROLLBACK ===
-- DROP INDEX IF EXISTS "Machine_tenantId_isDeleted_idx";
-- ALTER TABLE "Machine" DROP COLUMN IF EXISTS "deletedAt";
-- ALTER TABLE "Machine" DROP COLUMN IF EXISTS "isDeleted";
-- ALTER TABLE "Machine" DROP COLUMN IF EXISTS "updatedAt";
