import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = 'test_debug@klypso.in';
    const password = 'Password@123';
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: { passwordHash },
        create: {
            email,
            passwordHash,
            fullName: 'Debug User',
            isSuperAdmin: true,
        },
    });

    console.log('User created/updated:', user.email);

    // Also create a tenant and membership for this user
    const tenant = await prisma.tenant.upsert({
        where: { slug: 'debug-tenant' },
        update: {},
        create: {
            name: 'Debug Tenant',
            slug: 'debug-tenant',
            isOnboarded: true,
        },
    });

    await prisma.tenantUser.upsert({
        where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
        update: {},
        create: {
            userId: user.id,
            tenantId: tenant.id,
            role: 'Owner',
        },
    });

    console.log('Tenant and Membership created.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
