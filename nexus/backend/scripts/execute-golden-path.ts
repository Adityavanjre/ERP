import { PrismaClient, POStatus, TransactionType, InvoiceStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function executeGoldenPath() {
  console.log('🚀 STARTING INTEGRATED BUSINESS CYCLE (GOLDEN PATH)...');
  
  // 0. Setup: Identify exact entities
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error('❌ No tenant found.');
  const tenantId = tenant.id;

  // Use names from debug-data.ts output
  const supplier = await prisma.supplier.findFirst({ where: { name: 'Karnataka Timber Traders', tenantId } });
  
  // We need a product to purchase. 'Teak Wood Plank' wasn't in the product list, but maybe it's there under a different name?
  // Let's look for any 'RM-' (Raw Material) product.
  const rawMaterial = await prisma.product.findFirst({ 
    where: { 
      OR: [
        { sku: { startsWith: 'RM-' } },
        { name: { contains: 'Wood' } }
      ],
      tenantId 
    } 
  });

  const desk = await prisma.product.findFirst({ where: { sku: 'FG-DESK-001', tenantId } });
  const bom = await prisma.billOfMaterial.findFirst({ where: { productId: desk?.id, tenantId } });
  const customer = await prisma.customer.findFirst({ where: { company: 'Urban Living Pvt Ltd', tenantId } });

  if (!supplier || !rawMaterial || !desk || !bom || !customer) {
    console.log({ supplier: !!supplier, rawMaterial: !!rawMaterial, desk: !!desk, bom: !!bom, customer: !!customer });
    throw new Error('❌ Missing dependencies. Check product/supplier/customer names.');
  }

  console.log(`Using Raw Material: ${rawMaterial.name} (${rawMaterial.sku})`);
  console.log(`Using Finished Good: ${desk.name} (${desk.sku})`);

  // --- STEP 1: PROCUREMENT ---
  console.log('\n📦 Phase 1: Procurement');
  const poNumber = `PO-${Math.floor(1000 + Math.random() * 9000)}`;
  const poAmount = new Decimal(10000);

  const po = await prisma.purchaseOrder.create({
    data: {
      tenantId,
      supplierId: supplier.id,
      orderNumber: poNumber,
      orderDate: new Date(),
      totalAmount: poAmount,
      status: POStatus.Ordered,
      items: {
        create: {
          productId: rawMaterial.id,
          quantity: new Decimal(50),
          unitPrice: new Decimal(200)
        }
      }
    }
  });

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: rawMaterial.id },
      data: { stock: { increment: new Decimal(50) } }
    });

    const invAcc = await tx.account.findFirst({ where: { name: 'Inventory Asset', tenantId } });
    const apAcc = await tx.account.findFirst({ where: { name: 'Accounts Payable', tenantId } });

    if (invAcc && apAcc) {
      await tx.journalEntry.create({
        data: {
          tenantId,
          description: `PO Receipt #${poNumber}`,
          reference: poNumber,
          posted: true,
          transactions: {
            create: [
              { tenantId, accountId: invAcc.id, type: TransactionType.Debit, amount: poAmount, description: `Stock Receipt - ${poNumber}` },
              { tenantId, accountId: apAcc.id, type: TransactionType.Credit, amount: poAmount, description: `Vendor Liability - ${poNumber}` }
            ]
          }
        }
      });
      await tx.account.update({ where: { id: invAcc.id }, data: { balance: { increment: poAmount } } });
      await tx.account.update({ where: { id: apAcc.id }, data: { balance: { increment: poAmount } } });
    }
    await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: POStatus.Received } });
  });
  console.log(`✅ Step 1: Purchased 50 units of ${rawMaterial.name}.`);

  // --- STEP 2: MANUFACTURING ---
  console.log('\n🏭 Phase 2: Manufacturing');
  const woNumber = `WO-${Math.floor(1000 + Math.random() * 9000)}`;
  const bomItems = await prisma.bOMItem.findMany({ where: { bomId: bom.id } });

  await prisma.$transaction(async (tx) => {
    for (const item of bomItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: new Decimal(item.quantity).mul(5) } }
      });
    }
    await tx.product.update({
      where: { id: desk.id },
      data: { stock: { increment: new Decimal(5) } }
    });
    await tx.workOrder.create({
      data: {
        tenantId,
        bomId: bom.id,
        orderNumber: woNumber,
        status: 'Completed',
        quantity: 5,
        startDate: new Date(),
        endDate: new Date()
      }
    });
  });
  console.log(`✅ Step 2: Produced 5 ${desk.name}. Materials deducted.`);

  // --- STEP 3: SALES ---
  console.log('\n💰 Phase 3: Sales');
  const invoiceNum = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
  const saleAmount = new Decimal(15000);

  await prisma.$transaction(async (tx) => {
    await tx.invoice.create({
      data: {
        tenantId,
        customerId: customer.id,
        invoiceNumber: invoiceNum,
        issueDate: new Date(),
        dueDate: new Date(),
        totalAmount: saleAmount,
        status: InvoiceStatus.Paid,
        items: {
          create: {
            productId: desk.id,
            quantity: new Decimal(2),
            unitPrice: new Decimal(7500),
            gstRate: new Decimal(0),
            taxableAmount: saleAmount,
            gstAmount: new Decimal(0),
            totalAmount: saleAmount
          }
        }
      }
    });

    await tx.product.update({
      where: { id: desk.id },
      data: { stock: { decrement: new Decimal(2) } }
    });

    const bankAcc = await tx.account.findFirst({ where: { name: 'Bank', tenantId } });
    const revAcc = await tx.account.findFirst({ where: { name: 'Sales Revenue', tenantId } });

    if (bankAcc && revAcc) {
      await tx.journalEntry.create({
        data: {
          tenantId,
          description: `Sale Invoicing #${invoiceNum}`,
          reference: invoiceNum,
          posted: true,
          transactions: {
            create: [
              { tenantId, accountId: bankAcc.id, type: TransactionType.Debit, amount: saleAmount, description: `Customer Payment - ${invoiceNum}` },
              { tenantId, accountId: revAcc.id, type: TransactionType.Credit, amount: saleAmount, description: `Revenue Recording - ${invoiceNum}` }
            ]
          }
        }
      });
      await tx.account.update({ where: { id: bankAcc.id }, data: { balance: { increment: saleAmount } } });
      await tx.account.update({ where: { id: revAcc.id }, data: { balance: { increment: saleAmount } } });
    }
  });
  console.log(`✅ Step 3: Sold 2 units of ${desk.name}. Sale recorded.`);

  console.log('\n🏆 GOLDEN PATH EXECUTION SUCCESSFUL!');
}

executeGoldenPath()
  .catch(err => {
    console.error('❌ GOLDEN PATH FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
