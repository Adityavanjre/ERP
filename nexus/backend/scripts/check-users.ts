
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      memberships: {
        include: {
          tenant: true
        }
      }
    }
  });
  console.log('--- USER DIAGNOSTIC ---');
  users.forEach(u => {
    console.log(`User: ${u.email}, memberships: ${u.memberships.length}`);
    u.memberships.forEach(m => {
      console.log(`  - Tenant: ${m.tenant.name} (${m.tenant.id}), Role: ${m.role}`);
    });
  });
  await prisma.$disconnect();
}

main().catch(console.error);
