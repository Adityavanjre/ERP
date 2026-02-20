
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUser() {
  const email = 'chiffonsfashion@gmail.com';
  console.log(`Checking for user: ${email}...`);

  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: true }
  });

  if (user) {
    console.log(`✅ User found: ${user.email} (${user.id})`);
    console.log(`   Memberships: ${user.memberships.length}`);
  } else {
    console.log(`❌ User NOT found: ${email}`);
  }
}

checkUser()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
