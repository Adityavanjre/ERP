
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  console.log('Checking DB Connection...');
  try {
    const tenants = await prisma.tenant.findMany({ take: 1 });
    console.log('✅ Connected. Found tenants:', tenants.length);
    if (tenants.length > 0) console.log('Sample:', tenants[0].name);
  } catch (e) {
    console.error('❌ Connection Failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
