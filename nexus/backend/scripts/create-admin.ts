
import { PrismaClient, Role, TenantType, PlanType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  console.log('🔐 RESTORING ADMIN ACCESS...');

  const email = 'admin@klypso.agency';
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);

  // 1. Ensure Tenant exists (The "Imperial Nexus" or default)
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'imperial-nexus' },
    update: {},
    create: {
      name: 'Imperial Nexus',
      slug: 'imperial-nexus',
      type: TenantType.Manufacturing,
      plan: PlanType.Enterprise,
      address: 'Headquarters',
      gstin: '29AAAAA0000A1Z5'
    }
  });

  console.log(`✅ Tenant: ${tenant.name} (${tenant.id})`);

  // 2. Create/Update User
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash: hashedPassword },
    create: {
      email,
      passwordHash: hashedPassword,
      fullName: 'System Administrator',
      isSuperAdmin: true,
      avatarUrl: 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff'
    }
  });

  console.log(`✅ User: ${user.email} (${user.id})`);

  // 3. Link User to Tenant as Owner
  await prisma.tenantUser.upsert({
    where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
    update: { role: Role.Owner },
    create: {
      userId: user.id,
      tenantId: tenant.id,
      role: Role.Owner
    }
  });

  console.log('✅ Access Restored.');
  console.log('------------------------------------------------');
  console.log(`E-mail:   ${email}`);
  console.log(`Password: ${password}`);
  console.log('------------------------------------------------');
}

createAdmin()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
