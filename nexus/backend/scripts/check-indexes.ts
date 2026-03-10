
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const indexes: any = await prisma.$queryRaw`
      SELECT tablename, indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename IN ('AuditLog', 'Product', 'Customer', 'Invoice', 'Transaction')
      ORDER BY tablename, indexname
    `;
        console.log('Current System Indexes:');
        indexes.forEach((idx: any) => {
            console.log(`[${idx.tablename}] ${idx.indexname}: ${idx.indexdef}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
