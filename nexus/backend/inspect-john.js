const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'john@example.com' },
    include: {
      memberships: {
        include: { tenant: true }
      }
    }
  });

  console.log('\n=== JOHN MEMBERSHIPS ===');
  if (!user) {
    console.log('John not found!');
  } else {
    console.log(`User: ${user.email} (${user.id})`);
    console.log(`Memberships count: ${user.memberships.length}`);
    user.memberships.forEach(m => {
      console.log(`  Tenant: ${m.tenant.name} (${m.tenant.slug}) - Role/Perms: ${m.permissions} - Tenant isOnboarded: ${m.tenant.isOnboarded}`);
    });
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
