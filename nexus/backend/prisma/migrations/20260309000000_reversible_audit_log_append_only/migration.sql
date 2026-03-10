-- audit_log_append_only.sql
-- SEC-013: Append-Only Audit Integrity
-- This trigger prevents ANY update or delete on the AuditLog table.
-- Even a database superuser (application level) cannot tamper with history.

CREATE OR REPLACE FUNCTION audit_log_append_only()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        RAISE EXCEPTION 'SECURITY_VIOLATION: AuditLog is append-only. Updates are strictly forbidden.';
    END IF;
    IF (TG_OP = 'DELETE') THEN
        RAISE EXCEPTION 'SECURITY_VIOLATION: AuditLog is append-only. Deletions are strictly forbidden.';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_log_append_only ON "AuditLog";

CREATE TRIGGER trg_audit_log_append_only
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();
