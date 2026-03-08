-- scripts/audit_trigger.sql
-- SEC-050: Database-level enforcement of Audit Log immutability.
-- This ensures that even if application-level RBAC is bypassed, 
-- the database itself will reject any attempts to modify or delete audit trails.

CREATE OR REPLACE FUNCTION block_audit_log_modifications()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'SEC-050: AuditLog entries are immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

-- Drop if exists to ensure idempotent execution
DROP TRIGGER IF EXISTS audit_log_append_only ON "AuditLog";

CREATE TRIGGER audit_log_append_only
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW
EXECUTE FUNCTION block_audit_log_modifications();
