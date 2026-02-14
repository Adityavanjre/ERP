
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'manager@test.com';
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);
  const tenantSlug = 'b2b-tenant';

  // 1. Find Tenant
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) {
    throw new Error('Tenant b2b-tenant not found. Run setup-b2b.ts first.');
  }

  // 2. Create User
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        fullName: 'Manager User',
      },
    });
    console.log(`Created Manager User: ${user.id}`);
  } else {
    console.log(`Manager User already exists: ${user.id}`);
  }

  // 3. Create Membership
  const membership = await prisma.tenantUser.findUnique({
    where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
  });
  if (!membership) {
    await prisma.tenantUser.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: 'Manager', // Explicitly Manager
      },
    });
    console.log('Created Manager Membership');
  } else {
      console.log('Membership already exists');
      if (membership.role !== 'Manager') {
          await prisma.tenantUser.update({
              where: { id: membership.id },
              data: { role: 'Manager' }
          });
          console.log('Updated role to Manager');
      }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
