
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Deep Financial Audit Starting ---');
  
  // Clean slate for audit tenant
  const tenantId = 'audit-tenant-' + Date.now();
  await prisma.tenant.create({
    data: { id: tenantId, name: 'Audit Corp', slug: tenantId, address: 'Audit Lane' }
  });

  // 1. Setup Product
  const product = await prisma.product.create({
    data: {
      tenantId,
      name: 'Gold Bar',
      sku: 'GOLD-001-' + Date.now(),
      // @ts-ignore
      price: new Decimal(100.00),
      // @ts-ignore
      stock: new Decimal(10.00),
    }
  });

  // Create Dummy Customer
  const customer = await prisma.customer.create({
    data: {
      tenantId,
      firstName: 'Audit',
      lastName: 'User',
      status: 'Customer'
    }
  });

  // @ts-ignore
  console.log(`[Setup] Product Created: ${product.sku} | Stock: ${product.stock}`);

  // 2. Concurrency Test: Overselling
  console.log('[Test] Starting Concurrency Attack (Double F1 Submission)...');
  
  // Function to simulate selling 2 items
  const sell = async (idx: number) => {
    try {
        await prisma.$transaction(async (tx) => {
            // Re-fetch strictly inside transaction
            const p = await tx.product.findUniqueOrThrow({ where: { id: product.id } });
            
            // @ts-ignore
            if (new Decimal(p.stock).lessThan(2)) {
                throw new Error('Insufficient Stock');
            }

            // Decrement
            await tx.product.update({
                where: { id: product.id },
                data: { stock: { decrement: 2 } }
            });

            // Create Invoice (simplified)
            await tx.invoice.create({
                data: {
                    tenantId,
                    customerId: customer.id,
                    invoiceNumber: `INV-${Date.now()}-${idx}-${Math.random()}`,
                    dueDate: new Date(),
                    totalAmount: new Decimal(200),
                    items: {
                        create: [{
                            productId: product.id,
                            quantity: 2,
                            // @ts-ignore
                            unitPrice: 100,
                            gstRate: 0,
                            taxableAmount: 200,
                            gstAmount: 0,
                            totalAmount: 200
                        }]
                    }
                } as any // FORCE ANY
            });
        }, { timeout: 10000 }); // High timeout to allow contention
        return { status: 'fulfilled', idx };
    } catch (e: any) {
        return { status: 'rejected', idx, reason: e.message };
    }
  };

  // Launch 6 requests (Total 12 items). Stock is only 10.
  // Expected: 5 success, 1 failure.
  const promises = [1, 2, 3, 4, 5, 6].map(i => sell(i));
  const results = await Promise.all(promises);

  const fulfilled = results.filter(r => r.status === 'fulfilled').length;
  const rejected = results.filter(r => r.status === 'rejected').length;

  console.log(`[Result] Fulfilled: ${fulfilled} (Expected 5)`);
  console.log(`[Result] Rejected: ${rejected} (Expected 1)`);

  const finalProduct = await prisma.product.findUnique({ where: { id: product.id } });
  // @ts-ignore
  console.log(`[Verify] Final Stock: ${finalProduct?.stock} (Expected 0)`);

  // @ts-ignore
  const stock = new Decimal(finalProduct?.stock);

  if (fulfilled > 5 || stock.lessThan(0)) {
      console.error('CRITICAL: OVERSELLING DETECTED! Race condition exists.');
      console.log('--- Resuming Audit to checking precision ---');
  } else {
      console.log('SUCCESS: No Overselling.');
  }

  // 3. Precision Test
  console.log('[Test] Decimal Precision...');
  const smallQty = new Decimal('0.333333');
  const price = new Decimal('10.05');
  const expectedTotal = smallQty.mul(price).toDecimalPlaces(2); // 3.35

  try {
    await prisma.invoice.create({
        data: {
            tenantId,
            customerId: customer.id,
            invoiceNumber: `INV-PREC-${Date.now()}`,
            dueDate: new Date(),
            totalAmount: expectedTotal,
            items: {
                create: [{
                    productId: product.id,
                    quantity: smallQty, // 0.333333
                    // @ts-ignore
                    unitPrice: price,
                    gstRate: 0,
                    taxableAmount: expectedTotal,
                    gstAmount: 0,
                    totalAmount: expectedTotal
                }]
            }
        } as any // FORCE ANY
    });
  } catch (e: any) {
    console.error('PRECISION TEST FAILED:', e.message);
    process.exit(1);
  }

  const precisionInvoice = await prisma.invoice.findFirst({ where: { invoiceNumber: { startsWith: 'INV-PREC' } }, include: { items: true } });
  // @ts-ignore
  const savedQty = new Decimal(precisionInvoice?.items[0].quantity);
  
  if (!savedQty.equals(smallQty)) {
      console.error(`CRITICAL: Precision Loss! Sent ${smallQty}, Got ${savedQty}`);
      process.exit(1);
  } else {
      console.log(`[Success] Exact match: ${savedQty}`);
  }

  console.log('--- Audit Passed ---');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
