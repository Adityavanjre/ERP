-- Re-indexing AuditLog for forensic performance
-- Dropping existing indexes to ensure clean application of optimized coverage
DROP INDEX IF EXISTS "AuditLog_tenantId_createdAt_idx";
DROP INDEX IF EXISTS "AuditLog_userId_idx";
DROP INDEX IF EXISTS "AuditLog_correlationId_idx";
DROP INDEX IF EXISTS "AuditLog_action_idx";

-- Creating optimized forensic indices
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt" DESC);
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_correlationId_idx" ON "AuditLog"("correlationId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
