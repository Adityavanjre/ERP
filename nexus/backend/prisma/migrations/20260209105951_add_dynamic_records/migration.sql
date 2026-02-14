-- AlterTable
ALTER TABLE "FieldDefinition" ADD COLUMN "targetModel" TEXT;

-- CreateTable
CREATE TABLE "Record" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Record_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Record_modelName_idx" ON "Record"("modelName");

-- CreateIndex
CREATE INDEX "Record_tenantId_idx" ON "Record"("tenantId");
