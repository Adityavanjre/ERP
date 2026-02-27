
import { PrismaClient, Role, TenantType, PlanType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function createAdmin() {
  console.log('🔐 SECURE ADMIN SEEDER — LOCAL ACCESS ONLY');

  const email = process.env.ADMIN_EMAIL || 'admin@nexus.internal';

  // IP Phase 3: Generate a secure random password if not in env
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString('base64').replace(/[/+=]/g, '');
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
      address: 'Nexus Headquarters',
      gstin: '29AAAAA0000A1Z5'
    }
  });

  // 2. Create/Update User
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash: hashedPassword },
    create: {
      email,
      passwordHash: hashedPassword,
      fullName: 'System Administrator',
      isSuperAdmin: true,
      avatarUrl: `https://ui-avatars.com/api/?name=Admin&background=000&color=fff`
    }
  });

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

  console.log('------------------------------------------------');
  console.log('✅ ADMIN SEEDED SUCCESSFULLY');
  console.log(`Identity:  ${email}`);
  console.log(`Credentials: ${password}`); // Only printed once to console
  console.log('------------------------------------------------');
  console.log('⚠️  Store this password securely. It is hashed in the database.');
}

createAdmin()
  .catch((e) => {
    console.error('❌ SEEDING FAILED:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
