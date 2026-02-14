const { PrismaClient, Role } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function seed() {
    const email = 'john@example.com';
    const password = 'password123';
    const fullName = 'John Doe';
    const tenantName = 'Klypso Corp';

    console.log(`Checking if user ${email} exists...`);
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        console.log('User already exists. Skipping seed.');
        return;
    }

    console.log('Seeding default admin user...');
    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                email,
                passwordHash,
                fullName,
            },
        });

        const tenant = await tx.tenant.create({
            data: {
                name: tenantName,
                slug: 'klypso-corp',
            },
        });

        await tx.tenantUser.create({
            data: {
                userId: user.id,
                tenantId: tenant.id,
                role: Role.Owner,
            },
        });

        // Initialize Chart of Accounts
        // We can't easily call the service here without nest context, 
        // but we can manually setup the critical ones if needed, 
        // or just let the user call the endpoint I added earlier.
        // Actually, I'll just do a minimal setup here.
        const accountNames = [
            { name: 'Bank', type: 'Asset', code: '1001' },
            { name: 'Accounts Receivable', type: 'Asset', code: '1002' },
            { name: 'Inventory Asset', type: 'Asset', code: '1003' },
            { name: 'Accounts Payable', type: 'Liability', code: '2001' },
            { name: 'GST Payable', type: 'Liability', code: '2002' },
            { name: 'Sales Revenue', type: 'Revenue', code: '3001' },
            { name: 'Cost of Goods Sold', type: 'Expense', code: '4001' }
        ];

        for (const acc of accountNames) {
            await tx.account.create({
                data: {
                    tenantId: tenant.id,
                    name: acc.name,
                    type: acc.type,
                    code: acc.code,
                    balance: 0
                }
            });
        }

        // Auto-install basic apps for the tenant (In a multi-tenant SaaS we'd have a separate table for subscriptions)
        // But since the current 'App' table has an 'installed' boolean (which seems shared/global in this schema?)
        // Actually looking at 'RegistryService', 'installed' is on the 'App' model.
        // If it's on 'App' model directly, it's global.
        await tx.app.updateMany({
            where: { name: { in: ['inventory', 'sales', 'crm', 'accounting'] } },
            data: { installed: true }
        });
    });

    console.log('Seeding complete.');
}

seed()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
