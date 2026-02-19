const { PrismaClient, TenantType, PlanType, Role } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://postgres.nyakpylctpygnlrxvhxn:UvgtMof7AgAsubaQ@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
        },
    },
});

const dto = {
    email: 'debug_admin_local_3@klypso.in',
    password: 'StrongPassword123!',
    fullName: 'Debug Admin Local',
    tenantName: 'Debug Corp Local',
    companyType: 'Technology'
};

async function main() {
    console.log('Starting registration simulation...');

    try {
        // 1. Check user
        const existingUser = await prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existingUser) {
            console.log('User already exists, skipping hash...');
        } else {
            console.log('User does not exist, proceeding...');
        }

        // 2. Hash
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(dto.password, salt);

        // 3. Sequential Execution (No Transaction)
        console.log('Starting sequential execution...');

        // Create User
        const user = await prisma.user.create({
            data: {
                email: dto.email,
                passwordHash,
                fullName: dto.fullName,
            },
        });
        console.log('User created:', user.id);

        // Create Tenant
        const slug = dto.tenantName.toLowerCase().replace(/ /g, '-');
        let finalSlug = slug;
        // Simplified slug check logic
        const slugCount = await prisma.tenant.count({
            where: { slug: { startsWith: slug } },
        });
        if (slugCount > 0) {
            finalSlug = `${slug}-${slugCount + 1}`;
        }

        console.log('Creating tenant with slug:', finalSlug);
        const tenant = await prisma.tenant.create({
            data: {
                name: dto.tenantName,
                slug: finalSlug,
                type: 'Retail',
                plan: 'Free',
            },
        });
        console.log('Tenant created:', tenant.id);

        // Create Membership
        await prisma.tenantUser.create({
            data: {
                userId: user.id,
                tenantId: tenant.id,
                role: 'Owner',
            }
        });
        console.log('Membership created');

        // Initialize Accounts
        const defaults = [
            { name: 'Accounts Receivable', type: 'Asset', code: '1001' },
            { name: 'Bank', type: 'Asset', code: '1002' },
            { name: 'Cash', type: 'Asset', code: '1003' },
            { name: 'Inventory', type: 'Asset', code: '1004' },
        ];

        for (const acc of defaults) {
            await prisma.account.create({
                data: { ...acc, tenantId: tenant.id, balance: 0 },
            });
        }
        console.log('Accounts initialized');

        // return { user, tenant };    });

        console.log('REGISTRATION SUCCESS');

    } catch (error) {
        console.error('REGISTRATION FAILED');
        console.error(JSON.stringify(error, null, 2));
        console.error(error); // Keep original too
    } finally {
        await prisma.$disconnect();
    }
}

main();
