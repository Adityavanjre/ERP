import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function debugData() {
  console.log('--- PRODUCTS ---');
  const prods = await p.product.findMany({ select: { id: true, name: true, sku: true } });
  console.log(prods);

  console.log('\n--- SUPPLIERS ---');
  const supps = await p.supplier.findMany({ select: { id: true, name: true } });
  console.log(supps);

  console.log('\n--- CUSTOMERS ---');
  const custs = await p.customer.findMany({ select: { id: true, company: true, firstName: true } });
  console.log(custs);

  console.log('\n--- BOMS ---');
  const boms = await p.billOfMaterial.findMany({ select: { id: true, name: true, productId: true } });
  console.log(boms);
}

debugData().finally(() => p.$disconnect());
