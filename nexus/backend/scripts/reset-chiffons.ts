
import { PrismaClient, Role, TenantType, PlanType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetChiffons() {
  console.log('🔐 MANUALLY RESTORING ACCESS FOR CHIFFONS FASHION...');

  const email = 'chiffonsfashion@gmail.com';
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);

  // 1. Ensure Tenant exists (or use default)
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'chiffons-fashion' },
    update: {},
    create: {
      name: 'Chiffons Fashion',
      slug: 'chiffons-fashion',
      type: TenantType.Retail,
      plan: PlanType.Pro
    }
  });

  // 2. Upsert User
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash: hashedPassword },
    create: {
      email,
      passwordHash: hashedPassword,
      fullName: 'Chiffons Admin',
      isSuperAdmin: false
    }
  });

  // 3. Ensure Membership
  await prisma.tenantUser.upsert({
    where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
    update: { role: Role.Owner },
    create: {
      userId: user.id,
      tenantId: tenant.id,
      role: Role.Owner
    }
  });

  console.log('✅ Success! User updated.');
  console.log('------------------------------------------------');
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log('------------------------------------------------');
  console.log('👉 You can now login directly with these credentials.');
}

resetChiffons()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
