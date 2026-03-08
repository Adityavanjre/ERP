import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const tables = [
            'User', 'Tenant', 'Account', 'AuditLog', 'Product',
            'Transaction', 'JournalEntry', 'Invoice', 'Payment',
            'PurchaseOrder', 'Customer', 'Supplier', 'TenantUser'
        ];
        for (const table of tables) {
            const columns: any[] = await prisma.$queryRawUnsafe(
                `SELECT column_name FROM information_schema.columns WHERE table_name = '${table}'`
            );
            console.log(`--- ${table} ---`);
            console.log(columns.map(c => c.column_name).sort().join('\n'));
        }
    } catch (err: any) {
        console.error('Error checking columns:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
