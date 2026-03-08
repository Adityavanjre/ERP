import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const email = 'healthcare_test_v3@klypso.in';
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                memberships: {
                    include: {
                        tenant: true
                    }
                }
            }
        });

        if (user) {
            console.log('User found:', user.email);
            for (const membership of user.memberships) {
                console.log('Tenant:', membership.tenant.name);
                console.log('Industry:', membership.tenant.industry);
                console.log('Type:', membership.tenant.type);
            }
        } else {
            console.log('User not found');
        }
    } catch (err: any) {
        console.error('Error:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
