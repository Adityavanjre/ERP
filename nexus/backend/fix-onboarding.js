const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Show current state
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, isOnboarded: true, slug: true }
  });
  console.log('\n=== TENANTS ===');
  tenants.forEach(t => console.log(`  ${t.name} (${t.slug}) - isOnboarded: ${t.isOnboarded}`));

  const users = await prisma.user.findMany({
    select: { id: true, email: true, tokenVersion: true, isSuperAdmin: true },
    take: 5
  });
  console.log('\n=== USERS ===');
  users.forEach(u => console.log(`  ${u.email} - tokenVersion: ${u.tokenVersion}, isSuperAdmin: ${u.isSuperAdmin}`));

  // 2. Fix: Mark all tenants as onboarded
  const result = await prisma.tenant.updateMany({
    where: { isOnboarded: false },
    data: { isOnboarded: true }
  });
  console.log(`\n=== FIX APPLIED: ${result.count} tenants marked as onboarded ===`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
