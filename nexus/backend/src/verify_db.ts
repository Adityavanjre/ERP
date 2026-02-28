import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: "postgresql://admin:password@127.0.0.1:5432/erp_db?schema=public"
            }
        }
    });
    try {
        const userCount = await prisma.user.count();
        console.log(`User count: ${userCount}`);

        const firstUser = await prisma.user.findFirst({
            select: { email: true, id: true }
        });
        console.log(`First User: ${JSON.stringify(firstUser)}`);

        const auditLogs = await prisma.auditLog.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
        });
        console.log(`Recent Audit Logs: ${JSON.stringify(auditLogs)}`);

        process.exit(0);
    } catch (error) {
        console.error(`DB Connection Error: ${error.message}`);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
