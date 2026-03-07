
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tenants = await prisma.tenant.findMany({
        select: {
            id: true,
            name: true,
            type: true,
            industry: true
        }
    });

    console.log('--- TENANT REPORT ---');
    tenants.forEach(t => {
        console.log(`Tenant: ${t.name} (ID: ${t.id})`);
        console.log(`Type: ${t.type}`);
        console.log(`Industry: ${t.industry}`);
        console.log('---');
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
