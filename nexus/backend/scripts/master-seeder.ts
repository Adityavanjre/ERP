import { PrismaClient, POStatus, TransactionType, InvoiceStatus, Stage, WorkOrderStatus, App, TenantType, PlanType, Role, FieldType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function seedMasterData() {
  console.log('🚀 INITIALIZING MASTER SEEDER (The Business Simulation)...');

  // 1. Setup Tenant & Default Accounts
  const tenant = await prisma.tenant.findFirst() || await prisma.tenant.create({
    data: {
      name: 'Premium Woodcraft Industries',
      slug: 'premium-woodcraft',
      type: TenantType.Manufacturing,
      plan: PlanType.Enterprise,
      address: '123 Industrial Area, Bangalore',
      gstin: '29ABCDE1234F1Z5'
    }
  });
  const tenantId = tenant.id;

  // 2. Clear Existing Activity (Optional but recommended for clean slate simulation)
  // await prisma.transaction.deleteMany({ where: { tenantId } });
  // await prisma.journalEntry.deleteMany({ where: { tenantId } });
  // await prisma.invoice.deleteMany({ where: { tenantId } });
  // await prisma.opportunity.deleteMany({ where: { tenantId } });

  // 3. Define Master Accounts (Ensure they exist)
  const accountDefs = [
    { name: 'Bank', code: '1000', type: 'Asset' },
    { name: 'Accounts Receivable', code: '1200', type: 'Asset' },
    { name: 'Inventory Asset', code: '1400', type: 'Asset' },
    { name: 'Accounts Payable', code: '2100', type: 'Liability' },
    { name: 'Sales Revenue', code: '4100', type: 'Revenue' },
    { name: 'Cost of Goods Sold', code: '5100', type: 'Expense' },
    { name: 'Raw Material Expense', code: '5200', type: 'Expense' },
    { name: 'Factory Overheads', code: '5300', type: 'Expense' }
  ];

  for (const def of accountDefs) {
    await prisma.account.upsert({
      where: { tenantId_code: { tenantId, code: def.code } },
      update: {},
      create: { ...def, tenantId, type: def.type as any }
    });
  }

  // 4. Seed Suppliers (10+)
  const suppliers = ['Karnataka Timber Traders', 'National Hardware Co', 'Premium Coatings Ltd', 'Global Wood Imports', 'Fastenings Inc', 'Sawmill Solutions', 'Adhesive Experts', 'Finishing Touches', 'Timber Tech', 'Ironmongery Ltd'];
  for (const name of suppliers) {
    await prisma.supplier.upsert({
      where: { id: `supp-${name.replace(/\s/g, '-').toLowerCase()}` }, // Stable IDs for seeding
      update: { name },
      create: {
        id: `supp-${name.replace(/\s/g, '-').toLowerCase()}`,
        name,
        email: `contact@${name.replace(/\s/g, '').toLowerCase()}.com`,
        tenantId
      }
    });
  }

  // 5. Seed Customers (20+)
  const customerNames = ['Urban Living Pvt Ltd', 'HomeStyle Interiors', 'Corporate Furnishings', 'Metro Builders', 'Serene Resorts', 'Office Solutions', 'Dwellings Co', 'Modern Spaces', 'City Architects', 'Luxe Living', 'Budget Furnishings', 'Iconic Structures', 'Green Dwellings', 'Smart Offices', 'Vintage Homes', 'Elegant Decors', 'Prime Estates', 'Classic Designs', 'Regal Interiors', 'Nuovo Concepts'];
  for (const name of customerNames) {
    await prisma.customer.upsert({
      where: { id: `cust-${name.replace(/\s/g, '-').toLowerCase()}` },
      update: { company: name },
      create: {
        id: `cust-${name.replace(/\s/g, '-').toLowerCase()}`,
        company: name,
        firstName: name.split(' ')[0],
        tenantId,
        status: 'Customer'
      }
    });
  }

  // 6. CRM: Opportunities (15+ across pipeline)
  const stages: Stage[] = [Stage.New, Stage.Qualified, Stage.Proposal, Stage.Negotiation, Stage.Won, Stage.Lost];
  const allCustomers = await prisma.customer.findMany({ where: { tenantId } });
  for (let i = 0; i < 20; i++) {
    const cust = allCustomers[i % allCustomers.length];
    await prisma.opportunity.create({
      data: {
        tenantId,
        title: `Project ${cust.company} - Phase ${i}`,
        value: new Decimal(50000 + Math.random() * 100000),
        stage: stages[i % stages.length],
        customerId: cust.id,
        probability: (i % 6) * 15 + 10
      }
    });
  }

  // 7. Products & BOMs
  // (We'll reuse existing ones but ensure we have enough)
  const rawMaterials = [
    { name: 'Teak Wood Plank', sku: 'RM-TEAK-001', price: 200 },
    { name: 'Rosewood Board', sku: 'RM-ROSE-001', price: 350 },
    { name: 'Steel Screws (100pack)', sku: 'RM-SCR-001', price: 50 },
    { name: 'Wood Glue (1L)', sku: 'RM-GLUE-001', price: 120 }
  ];

  for (const rm of rawMaterials) {
    await prisma.product.upsert({
      where: { tenantId_sku: { tenantId, sku: rm.sku } },
      update: {},
      create: { ...rm, tenantId, costPrice: rm.price, price: rm.price, stock: 500 }
    });
  }

  // Generate 25 more random raw materials to hit the 30+ product requirement
  for (let i = 1; i <= 25; i++) {
    await prisma.product.upsert({
      where: { tenantId_sku: { tenantId, sku: `RM-BULK-${i.toString().padStart(3, '0')}` } },
      update: {},
      create: { name: `Bulk Material ${i}`, sku: `RM-BULK-${i.toString().padStart(3, '0')}`, price: 50 + (i * 10), costPrice: 40 + (i * 8), tenantId, stock: 1000 }
    });
  }

  const finishedGoods = [
    { name: 'Executive Office Desk', sku: 'FG-DESK-001', price: 15000 },
    { name: 'Ergonomic Chair', sku: 'FG-CHAIR-001', price: 8000 },
    { name: 'Bookshelf Large', sku: 'FG-BOOK-001', price: 12000 }
  ];

  for (const fg of finishedGoods) {
    const p = await prisma.product.upsert({
      where: { tenantId_sku: { tenantId, sku: fg.sku } },
      update: {},
      create: { ...fg, tenantId, costPrice: fg.price * 0.6, stock: 0 }
    });

    // Create BOM if not exists
    await prisma.billOfMaterial.upsert({
      where: { id: `bom-${fg.sku}` },
      update: {},
      create: {
        id: `bom-${fg.sku}`,
        tenantId,
        name: `${fg.name} Standard BOM`,
        productId: p.id,
        quantity: 1,
        items: {
          create: [
            { tenantId, productId: (await prisma.product.findUnique({ where: { tenantId_sku: { tenantId, sku: 'RM-TEAK-001' } } }))!.id, quantity: 4 },
            { tenantId, productId: (await prisma.product.findUnique({ where: { tenantId_sku: { tenantId, sku: 'RM-SCR-001' } } }))!.id, quantity: 20 },
            { tenantId, productId: (await prisma.product.findUnique({ where: { tenantId_sku: { tenantId, sku: 'RM-GLUE-001' } } }))!.id, quantity: 1 }
          ]
        }
      }
    });
  }

  // 8. Financial Activity: Historical Sales Orders & Journals
  const invAcc = await prisma.account.findFirst({ where: { name: 'Inventory Asset', tenantId } });
  const revAcc = await prisma.account.findFirst({ where: { name: 'Sales Revenue', tenantId } });
  const arAcc = await prisma.account.findFirst({ where: { name: 'Accounts Receivable', tenantId } });

  // Cleanup historical seed data to avoid unique constraint errors
  // 1. Delete dependent items first
  await prisma.invoiceItem.deleteMany({ where: { invoice: { invoiceNumber: { startsWith: 'INV-HIST-' } } } });
  await prisma.orderItem.deleteMany({ where: { order: { tenantId } } });

  // 2. Delete parents
  await prisma.invoice.deleteMany({ where: { tenantId, invoiceNumber: { startsWith: 'INV-HIST-' } } });
  await prisma.order.deleteMany({ where: { tenantId } });
  await prisma.journalEntry.deleteMany({ where: { tenantId, description: { startsWith: 'Sales Order #' } } });
  await prisma.stockMovement.deleteMany({ where: { tenantId, notes: { startsWith: 'Historical Sale' } } });

  // Get Primary Warehouse
  const warehouse = await prisma.warehouse.findFirst({ where: { tenantId } }) ||
    await prisma.warehouse.create({ data: { tenantId, name: 'Main Depot', location: 'HQ' } });

  console.log('Generating 150 Sales Orders, Journal Entries, and Stock Movements...');
  for (let i = 0; i < 150; i++) {
    const cust = allCustomers[i % allCustomers.length];
    const amount = new Decimal(10000 + Math.random() * 20000);
    const date = new Date();
    date.setDate(date.getDate() - (i * 2)); // Spread over last 70 days

    // Create Order (This is what shows up in the Sales table)
    const order = await prisma.order.create({
      data: {
        tenantId,
        customerId: cust.id,
        total: amount,
        status: i % 5 === 0 ? 'Pending' : 'Paid',
        createdAt: date,
        items: {
          create: {
            productId: (await prisma.product.findFirst({ where: { sku: 'FG-DESK-001' } }))!.id,
            quantity: new Decimal(1),
            price: amount
          }
        }
      }
    });

    // Create matching Invoice for historical accuracy
    await prisma.invoice.create({
      data: {
        tenantId,
        customerId: cust.id,
        invoiceNumber: `INV-HIST-${1000 + i}`,
        issueDate: date,
        dueDate: new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000),
        totalAmount: amount,
        status: i % 5 === 0 ? 'Unpaid' : 'Paid',
        idempotencyKey: `hist-inv-${order.id}`
      }
    });

    // Journal Entry for each sale
    if (arAcc && revAcc) {
      await prisma.journalEntry.create({
        data: {
          tenantId,
          date,
          description: `Sales Order #${order.id.slice(0, 8)}`,
          reference: order.id.slice(0, 8),
          posted: true,
          transactions: {
            create: [
              { tenantId, accountId: arAcc.id, type: 'Debit', amount, description: 'Client Debt' },
              { tenantId, accountId: revAcc.id, type: 'Credit', amount, description: 'Revenue Recognition' }
            ]
          }
        }
      });
      await prisma.account.update({ where: { id: arAcc.id }, data: { balance: { increment: amount } } });
      await prisma.account.update({ where: { id: revAcc.id }, data: { balance: { increment: amount } } });
    }

    // Generate Stock Movement for inventory history
    await prisma.stockMovement.create({
      data: {
        tenantId,
        productId: (await prisma.product.findFirst({ where: { sku: 'FG-DESK-001' } }))!.id,
        warehouseId: warehouse.id,
        quantity: new Decimal(-1),
        type: 'OUT',
        notes: `Historical Sale: ${order.id.slice(0, 8)}`,
        reference: order.id,
        createdAt: date
      }
    });
  }

  // 9. Manufacturing: Machines & Work Orders
  const machineNames = ['Table Saw Alpha', 'CNC Router Pro', 'Heavy Duty Planner', 'Sanding Station', 'Edge Bander Max'];
  for (const name of machineNames) {
    await prisma.machine.create({
      data: { name, code: name.replace(/\s/g, '-').toUpperCase(), tenantId, status: 'Idle' }
    });
  }

  const allBoms = await prisma.billOfMaterial.findMany({ where: { tenantId } });
  for (let i = 0; i < 20; i++) {
    const bom = allBoms[i % allBoms.length];
    await prisma.workOrder.create({
      data: {
        tenantId,
        orderNumber: `WO-SCHED-${2000 + i}`,
        bomId: bom.id,
        quantity: 5 + i,
        status: i < 5 ? 'Planned' : (i < 10 ? 'InProgress' : 'Completed'),
        priority: i % 3 === 0 ? 'High' : 'Medium',
        startDate: new Date(),
        endDate: i >= 10 ? new Date() : null
      }
    });
  }

  console.log('✅ MASTER SEEDER COMPLETE. System is now data-rich.');
}

seedMasterData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
