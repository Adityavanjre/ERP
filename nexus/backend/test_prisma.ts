import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] });

async function main() {
    try {
        await prisma.$transaction(async (tx: any) => {
            const tenantId = "test-tenant-123";
            console.log("Adding mock tenant");
            const tenant = await tx.tenant.create({
                data: {
                    id: tenantId,
                    name: "Test Tenant",
                    slug: "test-tenant-123",
                    type: "Healthcare",
                    plan: "Free",
                    subscriptionStatus: "Active",
                    isOnboarded: false,
                }
            });

            console.log("Mocking ledger.service.initializeTenantAccounts");
            const baseAccounts = [
                { name: 'Accounts Receivable', type: 'Asset', code: '1001' },
                { name: 'Pharmacy Inventory', type: 'Asset', code: '1004H' },
                { name: 'Cash', type: 'Asset', code: '1002' }
            ];

            for (const acc of baseAccounts) {
                const exists = await tx.account.findFirst({
                    where: {
                        tenantId,
                        OR: [{ name: acc.name }, { code: acc.code }],
                    },
                });

                if (!exists) {
                    await tx.account.create({
                        data: { ...acc, tenantId, balance: 0 },
                    });
                }
            }

            console.log("Done initializing accounts");
            // throw intentionally if we want to test rollback, but let's test success
            throw new Error("Simulated intentional rollback to not litter the DB");
        });
    } catch (e) {
        console.error("Caught error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
