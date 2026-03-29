import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
    const email = process.env.ADMIN_EMAIL || (() => { throw new Error('ADMIN_EMAIL env var is required'); })();
    const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(password, 10);

    console.log('--- 🛠️ SETTING UP SUPER ADMIN: ADITYA ---');

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            passwordHash,
            isSuperAdmin: true,
            mfaEnabled: false // Disable for easy local testing
        },
        create: {
            email,
            passwordHash,
            fullName: 'Aditya Vanjre (Super Admin)',
            isSuperAdmin: true,
            mfaEnabled: false,
        },
    });

    console.log('✅ Super Admin User synced:', user.email);

    // Ensure he has a default tenant context if needed for testing
    const tenant = await prisma.tenant.upsert({
        where: { slug: 'nexus-hq' },
        update: {},
        create: {
            name: 'Nexus HQ',
            slug: 'nexus-hq',
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

    console.log('✅ Tenant "Nexus HQ" linked to Super Admin.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
