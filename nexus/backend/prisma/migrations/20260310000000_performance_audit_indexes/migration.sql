-- Re-indexing AuditLog for forensic performance
-- Dropping existing indexes if they don't have the desired sort/column coverage
DROP INDEX IF EXISTS "AuditLog_tenantId_createdAt_idx";
DROP INDEX IF EXISTS "AuditLog_correlationId_idx";

-- Creating optimized indices
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt" DESC);
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_correlationId_idx" ON "AuditLog"("correlationId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
