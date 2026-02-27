import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

/**
 * Audit Log Hash Chain Verification Utility
 * 
 * Usage:
 *   npx ts-node scripts/verify-audit-chain.ts --tenantId=<id>
 * 
 * This script scans the AuditLog for a tenant, recomputes the HMAC-SHA256 for each entry,
 * and verifies that the chain (prevHash -> entryHash) is intact.
 * Any mismatch proves that data was modified, deleted, or injected.
 */

const prisma = new PrismaClient();
const hmacSecret = process.env.AUDIT_HMAC_SECRET;

function sanitizeString(val: string): string {
    return (val || '').replace(/[\r\n\t]/g, ' ').trim();
}

function computeEntryHash(
    prevHash: string | null,
    action: string,
    resource: string,
    createdAt: Date,
    details: any,
): string {
    const canonicalInput = [
        prevHash ?? 'GENESIS',
        sanitizeString(action),
        sanitizeString(resource),
        createdAt.toISOString(),
        JSON.stringify(details ?? {}),
    ].join('|');

    return crypto
        .createHmac('sha256', hmacSecret!)
        .update(canonicalInput)
        .digest('hex');
}

async function verify() {
    if (!hmacSecret) {
        console.error('ERROR: AUDIT_HMAC_SECRET atmosphere variable is not set. Chain verification impossible.');
        process.exit(1);
    }

    const args = process.argv.slice(2);
    const tenantArg = args.find(a => a.startsWith('--tenantId='));
    const tenantId = tenantArg ? tenantArg.split('=')[1] : null;

    console.log(`\n--- Audit Log Integrity Scan ${tenantId ? `for Tenant: ${tenantId}` : '(Global)'} ---`);

    const logs = await prisma.auditLog.findMany({
        where: tenantId ? { tenantId } : {},
        orderBy: { createdAt: 'asc' },
    });

    if (logs.length === 0) {
        console.log('No audit logs found for this scope.');
        return;
    }

    let lastHash: string | null = null;
    let corruptedCount = 0;
    let verifiedCount = 0;

    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];

        // Skip entries without an entryHash (optional during migration period)
        if (!log.entryHash) {
            console.log(`[SKIPPED] Entry ${log.id.slice(0, 8)}: No hash present (Pre-Hardening)`);
            lastHash = null; // Break chain expectation if middle entry has no hash
            continue;
        }

        // Verify prevHash matches our expected lastHash
        if (log.prevHash !== lastHash) {
            console.error(`[TAMPERED] Entry ${log.id.slice(0, 8)}: Chain Break! Expected prevHash ${lastHash?.slice(0, 8)}, found ${log.prevHash?.slice(0, 8)}`);
            corruptedCount++;
        }

        // Recompute entryHash
        const recomputed = computeEntryHash(
            log.prevHash,
            log.action,
            log.resource,
            log.createdAt,
            log.details
        );

        if (recomputed !== log.entryHash) {
            console.error(`[TAMPERED] Entry ${log.id.slice(0, 8)}: Payload Mismatch! Logic proves record content was altered.`);
            corruptedCount++;
        } else {
            verifiedCount++;
        }

        lastHash = log.entryHash;
    }

    console.log('\n--- Scan Summary ---');
    console.log(`Total Entries: ${logs.length}`);
    console.log(`Verified OK:   ${verifiedCount}`);
    if (corruptedCount > 0) {
        console.error(`FAILED:        ${corruptedCount} integrity violations detected!`);
        process.exit(1);
    } else {
        console.log('INTEGRITY:     PASSED - All chained entries match cryptographic footprints.');
    }
}

verify()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
