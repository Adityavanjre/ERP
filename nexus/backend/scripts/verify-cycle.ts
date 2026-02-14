import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verify() {
  console.log('--- AUDIT: Business Cycle State ---');
  
  // 1. Check Purchases
  const latestPO = await prisma.purchaseOrder.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { supplier: true, items: { include: { product: true } } }
  });
  
  if (latestPO) {
    console.log(`Latest PO: ${latestPO.orderNumber} | Status: ${latestPO.status} | Supplier: ${latestPO.supplier.name}`);
    latestPO.items.forEach(item => {
      console.log(` - Product: ${item.product.name} | Qty: ${item.quantity}`);
    });
  } else {
    console.log('No Purchase Orders found.');
  }

  // 2. Check Stock for Critical Items
  const products = await prisma.product.findMany({
    where: { name: { in: ['Teak Wood Plank', 'Executive Office Desk'] } },
    select: { name: true, stock: true }
  });
  console.log('\n--- Stock Levels ---');
  products.forEach(p => console.log(`${p.name}: ${p.stock}`));

  // 3. Check Accounting Entries
  const latestJournals = await prisma.journalEntry.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { transactions: { include: { account: true } } }
  });
  
  console.log('\n--- Latest Accounting Journals ---');
  latestJournals.forEach(j => {
    console.log(`Journal: ${j.description} | Ref: ${j.reference}`);
    j.transactions.forEach(t => {
      console.log(`  - ${t.type} ${t.account.name}: ${t.amount}`);
    });
  });
}

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
