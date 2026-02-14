import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'john@example.com';
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        include: {
          tenant: true,
        },
      },
    },
  });

  if (!user) {
    console.log(`User ${email} not found.`);
    // List all users to see what's available
    const allUsers = await prisma.user.findMany({ take: 5 });
    console.log('Available users:', allUsers.map(u => u.email));
  } else {
    console.log('User found:', JSON.stringify(user, null, 2));
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
