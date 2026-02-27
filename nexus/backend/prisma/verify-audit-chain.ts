#!/usr/bin/env ts-node
/**
 * Audit Log Hash Chain Verification CLI
 *
 * Usage:
 *   npx ts-node prisma/verify-audit-chain.ts --tenantId=<id>
 *   npx ts-node prisma/verify-audit-chain.ts --all
 *
 * What it does:
 *   Reads all AuditLog entries for a tenant in ascending chronological order.
 *   Re-computes each entry's HMAC-SHA256 hash from its canonical fields.
 *   Verifies that the stored entryHash matches the computed hash.
 *   Verifies that each entry's prevHash matches the previous entry's entryHash.
 *
 * Exit codes:
 *   0 — chain is VALID for all checked entries
 *   1 — tampered entry detected (prints first failing entry)
 *   2 — configuration error (missing AUDIT_HMAC_SECRET or DATABASE_URL)
 */

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

const AUDIT_HMAC_SECRET = process.env.AUDIT_HMAC_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;

if (!AUDIT_HMAC_SECRET || !DATABASE_URL) {
    console.error('FATAL: AUDIT_HMAC_SECRET and DATABASE_URL must be set.');
    process.exit(2);
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
        action,
        resource,
        createdAt.toISOString(),
        JSON.stringify(details ?? {}),
    ].join('|');

    return crypto
        .createHmac('sha256', AUDIT_HMAC_SECRET!)
        .update(canonicalInput)
        .digest('hex');
}

async function verifyChain(tenantId: string | null): Promise<boolean> {
    const label = tenantId ?? 'GLOBAL (no tenantId)';
    console.log(`\nVerifying audit chain for tenant: ${label}`);

    const entries = await (prisma as any).auditLog.findMany({
        where: tenantId ? { tenantId } : { tenantId: null },
        orderBy: { createdAt: 'asc' },
    });

    if (entries.length === 0) {
        console.log(`  No audit entries found for tenant: ${label}`);
        return true;
    }

    // Entries written before hash chain was enabled will have null entryHash.
    // Skip those and start verifying from the first entry that has an entryHash.
    const firstHashedIndex = entries.findIndex((e: any) => e.entryHash !== null);
    if (firstHashedIndex === -1) {
        console.log(`  All ${entries.length} entries pre-date the hash chain feature. Nothing to verify.`);
        return true;
    }

    let valid = true;
    let prevHash: string | null = null;

    for (let i = firstHashedIndex; i < entries.length; i++) {
        const entry = entries[i];

        if (entry.entryHash === null) {
            // Mixed chain: some entries after first hashed entry lack hashes
            console.error(`  TAMPERED [${entry.id}] createdAt=${entry.createdAt.toISOString()} — entryHash is NULL after chain started`);
            valid = false;
            break;
        }

        const expectedHash = computeEntryHash(
            prevHash,
            entry.action,
            entry.resource,
            entry.createdAt,
            entry.details,
        );

        if (entry.entryHash !== expectedHash) {
            console.error(`  TAMPERED [${entry.id}] createdAt=${entry.createdAt.toISOString()}`);
            console.error(`    Stored:   ${entry.entryHash}`);
            console.error(`    Expected: ${expectedHash}`);
            valid = false;
            break;
        }

        if (i > firstHashedIndex && entry.prevHash !== prevHash) {
            console.error(`  CHAIN BROKEN [${entry.id}] — prevHash mismatch`);
            console.error(`    Stored prevHash:   ${entry.prevHash}`);
            console.error(`    Expected prevHash: ${prevHash}`);
            valid = false;
            break;
        }

        prevHash = entry.entryHash;
    }

    if (valid) {
        const checkedCount = entries.length - firstHashedIndex;
        console.log(`  VALID — ${checkedCount} chained entries verified successfully.`);
    }

    return valid;
}

async function main() {
    const args = process.argv.slice(2);
    const tenantIdArg = args.find((a) => a.startsWith('--tenantId='));
    const all = args.includes('--all');

    let overallValid = true;

    if (all) {
        const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
        for (const tenant of tenants) {
            const valid = await verifyChain(tenant.id);
            if (!valid) overallValid = false;
        }
    } else if (tenantIdArg) {
        const tenantId = tenantIdArg.split('=')[1];
        overallValid = await verifyChain(tenantId);
    } else {
        console.error('Usage: npx ts-node prisma/verify-audit-chain.ts --tenantId=<id>');
        console.error('       npx ts-node prisma/verify-audit-chain.ts --all');
        process.exit(2);
    }

    await prisma.$disconnect();

    if (!overallValid) {
        console.error('\nAUDIT CHAIN VERIFICATION: FAILED — tamper evidence detected.');
        process.exit(1);
    }

    console.log('\nAUDIT CHAIN VERIFICATION: PASSED — all chains are intact.');
    process.exit(0);
}

main().catch((e) => {
    console.error('Unexpected error during chain verification:', e);
    process.exit(1);
});
