import { PrismaClient } from '@prisma/client';

async function simulateCrossTenantAttacker() {
  const prisma = new PrismaClient();
  
  console.log('--- STARTING CROSS-TENANT SECURITY SIMULATION ---');
  
  try {
    // 1. Attempt to query all products without context
    console.log('Test 1: Querying products without tenant context...');
    try {
      const products = await prisma.product.findMany();
      console.error('FAIL: Managed to query products without tenant context!');
    } catch (e: any) {
      console.log('PASS: Query blocked as expected:', e.message);
    }

    // 2. Attempt to bypass via raw SQL (if possible, though Prisma proxy intercepts everything)
    console.log('\nTest 2: Raw SQL bypass attempt...');
    try {
      const rawRes = await prisma.$queryRaw`SELECT * FROM Product`;
      console.error('FAIL: Raw SQL bypass successful!');
    } catch (e: any) {
      console.log('PASS: Raw SQL potentially blocked or intercepted.');
    }

    // 3. Verify Global model access (Tenants should be accessible without context)
    console.log('\nTest 3: Querying Global models (Tenants)...');
    try {
      const tenants = await prisma.tenant.findMany();
      console.log(`PASS: Accessed ${tenants.length} tenants (expected behavior).`);
    } catch (e: any) {
      console.error('FAIL: Blocked on global model:', e.message);
    }

  } finally {
    await prisma.$disconnect();
  }
}

simulateCrossTenantAttacker();
