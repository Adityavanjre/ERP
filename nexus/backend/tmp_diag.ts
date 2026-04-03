import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  try {
    const user = await prisma.user.findUnique({
      where: { email: 'chiffonsfashion@gmail.com' },
      include: {
        memberships: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!user) {
      console.log('USER_NOT_FOUND');
      return;
    }

    const tenant = user.memberships[0]?.tenant;
    if (!tenant) {
      console.log('TENANT_NOT_FOUND');
      return;
    }

    const accountsCount = await prisma.account.count({
      where: { tenantId: tenant.id },
    });

    console.log(JSON.stringify({
      userId: user.id,
      email: user.email,
      tenantId: tenant.id,
      tenantName: tenant.name,
      industry: (tenant as any).industry,
      accountsCount,
    }, null, 2));

  } catch (error) {
    console.error('DIAGNOSTIC_ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
