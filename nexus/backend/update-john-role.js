const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'john@example.com' }
  });

  if (!user) {
    console.error('John Doe not found!');
    return;
  }

  // Update permissions to 'Owner' to grant full module visibility
  const updateResult = await prisma.tenantUser.updateMany({
    where: { userId: user.id },
    data: {
      permissions: 'Owner'
    }
  });

  console.log(`\n=== SUCCESS: Updated ${updateResult.count} memberships for John Doe to 'Owner' ===`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
