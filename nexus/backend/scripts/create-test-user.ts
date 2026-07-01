
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'woodcraft' } });
  if (!tenant) {
    console.error('Tenant not found');
    return;
  }

  const salt = await bcrypt.genSalt();
  const passwordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), salt);

  const user = await prisma.user.upsert({
    where: { email: 'biller@woodcraft.com' },
    update: {},
    create: {
      email: 'biller@woodcraft.com',
      passwordHash,
      fullName: 'Anita Biller',
    },
  });

  await prisma.tenantUser.upsert({
    where: {
      userId_tenantId: {
        userId: user.id,
        tenantId: tenant.id,
      },
    },
    update: { permissions: { role: 'Biller' } },
    create: {
      userId: user.id,
      tenantId: tenant.id,
      permissions: { role: 'Biller' },
    },
  });

  console.log('Biller user created: biller@woodcraft.com');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
