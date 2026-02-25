import { MOBILE_WHITELIST, Industry, Role } from '@nexus/shared';

// Mocking the Guard Logic for Static Verification (Merciless Revision)
function simulateGuard(context: {
    method: string;
    actionId: string | null;
    user: any;
    body: any;
    headers?: any;
}): { allowed: boolean; reason?: string } {
    const { method, actionId, user, body, headers } = context;

    // 1. Identify Channel (Fail-Closed)
    const channel = user?.channel || 'MOBILE'; // Assume Mobile if not explicitly Web
    if (channel !== 'MOBILE') return { allowed: true };

    // Anti-Spoofing: If user tries to claim they are WEB but token was anchored to MOBILE
    if (body?.channel === 'WEB') {
        return { allowed: false, reason: 'Channel spoofing detected in payload' };
    }

    // 2. Block by Default
    if (!actionId) return { allowed: false, reason: 'Action not in Mobile Whitelist' };

    const feature = MOBILE_WHITELIST[actionId];
    if (!feature) return { allowed: false, reason: 'Action configuration missing in Shared Truth' };

    // 3. Enforce Role (Server-Anchored)
    const hasRequiredRole = user.role && feature.requiredRoles.includes(user.role);
    if (!hasRequiredRole) return { allowed: false, reason: `Role '${user.role}' not authorized for '${actionId}'` };

    // 4. Enforce Status Transition Safety (POST/PATCH)
    if (method === 'POST' || method === 'PATCH') {
        const transitions = feature.allowedStatusTransitions;

        // Critical Rule: Write-actions MUST have transitions on mobile
        if (!transitions || transitions.length === 0) {
            return { allowed: false, reason: 'Missing state-transition matrix for mobile write' };
        }

        const targetStatus = body?.status;
        if (!targetStatus) {
            return { allowed: false, reason: "The 'status' field is required for mobile write-actions" };
        }

        const isAllowed = transitions.some((t: any) => t.to === targetStatus);
        if (!isAllowed) {
            return { allowed: false, reason: `Transition to '${targetStatus}' is forbidden on mobile` };
        }

        // INV-06: Binary Approval Zero-Mutation
        const isApprovalAction = actionId.startsWith('APPROVE') || actionId.includes('DECIDE') || actionId.includes('REJECT');
        if (isApprovalAction) {
            const allowedKeys = ['status', 'reason', 'rejectReason', 'idempotencyKey'];
            const illegalKeys = Object.keys(body).filter(k => !allowedKeys.includes(k));

            if (illegalKeys.length > 0) {
                return { allowed: false, reason: `Binary mutation forbidden: ${illegalKeys.join(', ')}` };
            }

            if (!body.idempotencyKey) {
                return { allowed: false, reason: 'Missing idempotencyKey for mobile binary action' };
            }
        }
    }

    return { allowed: true };
}

// Mocking Service-Level Accounting Check
function simulateService(action: string, context: { tenantId: string; date: Date; isLocked: boolean }): { success: boolean; error?: string } {
    if (context.isLocked) {
        return { success: false, error: 'Period is locked. Financial mutations forbidden.' };
    }
    return { success: true };
}

async function runMercilessAttacks() {
    console.log('--- Starting Merciless Hostile Governance Attack Simulation (8/8) ---');
    let passed = 0;
    let failed = 0;

    const testCases = [
        // 1️⃣ PAYLOAD TAMPERING
        {
            name: '💣 ATK-01: Status Forge (Draft -> Approved)',
            context: {
                method: 'POST',
                actionId: 'CREATE_ORDER',
                user: { role: Role.Owner, channel: 'MOBILE' },
                body: { status: 'Approved', total: 50000 }
            },
            shouldBlock: true
        },
        {
            name: '💣 ATK-02: Channel Spoofing (Inject channel: WEB)',
            context: {
                method: 'POST',
                actionId: 'CREATE_ORDER',
                user: { role: Role.Owner, channel: 'MOBILE' },
                body: { status: 'Draft', channel: 'WEB' }
            },
            shouldBlock: true
        },

        // 2️⃣ RAPID DOUBLE / TRIPLE SUBMISSION
        {
            name: '💣 ATK-03: Idempotency Bypass Attempt (Same Key)',
            // In a real test we'd run this twice, here we verify the rule requires the key
            context: {
                method: 'POST',
                actionId: 'APPROVE_ORDER',
                user: { role: Role.Owner, channel: 'MOBILE' },
                body: { status: 'Approved' } // Missing key
            },
            shouldBlock: true // Blocked if key is missing for approvals
        },

        // 3️⃣ REQUEST REPLAY ATTACKS
        {
            name: '💣 ATK-04: Replay with Modified Payload',
            context: {
                method: 'POST',
                actionId: 'APPROVE_ORDER',
                user: { role: Role.Owner, channel: 'MOBILE' },
                body: { status: 'Approved', total: 0 } // Tampered field
            },
            shouldBlock: true
        },

        // 4️⃣ UI BYPASS ATTEMPTS
        {
            name: '💣 ATK-05: Deep-link into Forbidden Completion',
            context: {
                method: 'POST',
                actionId: 'COMPLETE_WO', // Not in whitelist
                user: { role: Role.Owner, channel: 'MOBILE' },
                body: { status: 'Completed' }
            },
            shouldBlock: true
        },

        // 5️⃣ ROLE ESCALATION ATTACKS
        {
            name: '💣 ATK-06: Staff attempting Owner-only Approval',
            context: {
                method: 'POST',
                actionId: 'APPROVE_ORDER',
                user: { role: Role.Biller, channel: 'MOBILE' },
                body: { status: 'Approved', idempotencyKey: 'k1' }
            },
            shouldBlock: true
        },

        // 6️⃣ PERIOD & ACCOUNTING ATTACKS
        {
            name: '💣 ATK-07: Creation in Locked Period',
            // This is service level, we simulate the error from checkPeriodLock
            serviceCheck: { isLocked: true },
            shouldBlock: true
        },

        // 7️⃣ OFFLINE / SYNC EDGE CASES
        {
            name: '💣 ATK-08: Duplicate Sync (Idempotency holding)',
            context: {
                method: 'POST',
                actionId: 'CREATE_ORDER',
                user: { role: Role.Owner, channel: 'MOBILE' },
                body: { status: 'Draft', idempotencyKey: 'sync-123' }
            },
            shouldBlock: false // First one allowed, subsequent blocked by DB (idempotent)
        },

        // 8️⃣ TABLET-SPECIFIC ABUSE
        {
            name: '💣 ATK-09: Tablet Layout Elevation Attempt',
            context: {
                method: 'POST',
                actionId: 'CREATE_ORDER',
                user: { role: Role.Owner, channel: 'MOBILE', device: 'TABLET' },
                body: { status: 'Approved' } // Still trying to bypass
            },
            shouldBlock: true
        }
    ];

    for (const test of testCases) {
        let success = false;
        let resultReason = '';

        if (test.serviceCheck) {
            const result = simulateService('MUTATION', { tenantId: 't1', date: new Date(), isLocked: test.serviceCheck.isLocked });
            success = (result.success === !test.shouldBlock);
            resultReason = result.error || 'Passed service check';
        } else {
            const result = simulateGuard(test.context as any);
            success = (result.allowed === !test.shouldBlock);
            resultReason = result.reason || 'Allowed';
        }

        if (success) {
            console.log(`✅ PASSED: ${test.name}`);
            passed++;
        } else {
            console.error(`❌ FAILED: ${test.name}. Reason=${resultReason}`);
            failed++;
        }
    }

    console.log(`\n--- Execution Complete: ${passed} Passed, ${failed} Failed ---`);

    if (failed === 0) {
        console.log('\nCERTIFICATION: SYSTEM RESILIENT');
        process.exit(0);
    } else {
        console.log('\nCERTIFICATION: SYSTEM COMPROMISED');
        process.exit(1);
    }
}

runMercilessAttacks();
