
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'b2b@test.com';
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);

  // 1. Create User
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        fullName: 'B2B User',
      },
    });
    console.log(`Created User: ${user.id}`);
  } else {
    console.log(`User already exists: ${user.id}`);
  }

  // 2. Create Tenant
  let tenant = await prisma.tenant.findUnique({ where: { slug: 'b2b-tenant' } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'B2B Tenant',
        slug: 'b2b-tenant',
        type: 'Retail',
      },
    });
    console.log(`Created Tenant: ${tenant.id}`);
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
        role: 'Owner',
      },
    });
    console.log('Created Membership');
  }

  // 4. Create Customer linked to User
  let customer = await prisma.customer.findUnique({ where: { userId: user.id } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        firstName: 'B2B',
        lastName: 'Customer',
        email: email,
        userId: user.id, // THE CRITICAL LINK
      },
    });
    console.log(`Created Linked Customer: ${customer.id}`);
  } else {
     console.log(`Customer already linked: ${customer.id}`);
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
