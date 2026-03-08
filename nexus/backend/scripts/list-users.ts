import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      select: { email: true, createdAt: true },
      take: 10,
      orderBy: { createdAt: 'desc' }
    });
    console.log('Latest 10 users:');
    users.forEach(u => console.log(`${u.email} (${u.createdAt})`));
  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
