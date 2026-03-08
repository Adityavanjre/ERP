import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();

    const commands = [
        `CREATE OR REPLACE FUNCTION block_audit_log_modifications()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'SEC-050: AuditLog entries are immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;`,
        `DROP TRIGGER IF EXISTS audit_log_append_only ON "AuditLog";`,
        `CREATE TRIGGER audit_log_append_only
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW
EXECUTE FUNCTION block_audit_log_modifications();`
    ];

    console.log('Applying AuditLog append-only trigger...');
    try {
        for (const cmd of commands) {
            await prisma.$executeRawUnsafe(cmd);
        }
        console.log('Trigger applied successfully.');
    } catch (err) {
        console.error('Failed to apply trigger:', err);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
