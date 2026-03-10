
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const indexes: any = await prisma.$queryRaw`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'AuditLog'
    `;
        console.log('Current AuditLog Indexes:');
        indexes.forEach((idx: any) => {
            console.log(`- ${idx.indexname}: ${idx.indexdef}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
