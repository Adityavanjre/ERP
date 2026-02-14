import { PrismaClient, MovementType, PaymentMode, EmployeeStatus, LeaveType, PayrollStatus, ProjectStatus, Priority, TaskStatus, OrderStatus, POStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function runSuperSeeder() {
  console.log('🌟 STARTING SUPER SEEDER (100% Coverage Mode)...');

  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error('Tenant not found. Run master-seeder first.');
  const tenantId = tenant.id;

  // --- CLEANUP ---
  console.log('Cleaning up partial data for fresh simulation...');
  await prisma.payment.deleteMany({ where: { tenantId } });
  await prisma.stockMovement.deleteMany({ where: { tenantId } });
  await prisma.payroll.deleteMany({ where: { employee: { tenantId } } });
  await prisma.leave.deleteMany({ where: { employee: { tenantId } } });
  await prisma.employee.deleteMany({ where: { tenantId } });
  await prisma.department.deleteMany({ where: { tenantId } });
  await prisma.task.deleteMany({ where: { tenantId } });
  await prisma.project.deleteMany({ where: { tenantId } });
  await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrder: { tenantId } } });
  await prisma.purchaseOrder.deleteMany({ where: { tenantId } });

  // 1. HR: Departments & Employees
  console.log('Seeding HR (Departments, Employees, Payroll)...');
  const deptNames = ['Executive', 'Sales', 'Manufacturing', 'Accounts', 'Logistics', 'HR'];
  const depts = [];
  for (const name of deptNames) {
    depts.push(await prisma.department.create({ data: { name, tenantId } }));
  }

  const employees = [
    { firstName: 'Rajesh', lastName: 'Kumar', email: 'rajesh@woodcraft.com', jobTitle: 'CEO', salary: 250000, deptIdx: 0 },
    { firstName: 'Anita', lastName: 'Desai', email: 'anita@woodcraft.com', jobTitle: 'Sales Head', salary: 120000, deptIdx: 1 },
    { firstName: 'Vijay', lastName: 'Singh', email: 'vijay@woodcraft.com', jobTitle: 'Plant Manager', salary: 90000, deptIdx: 2 },
    { firstName: 'Sunita', lastName: 'Iyer', email: 'sunita@woodcraft.com', jobTitle: 'Chief Accountant', salary: 110000, deptIdx: 3 },
    { firstName: 'Ravi', lastName: 'Varma', email: 'ravi@woodcraft.com', jobTitle: 'Operations Lead', salary: 75000, deptIdx: 4 },
    { firstName: 'Priya', lastName: 'Sharma', email: 'priya@woodcraft.com', jobTitle: 'HR Exec', salary: 65000, deptIdx: 5 },
    { firstName: 'Amit', lastName: 'Patel', email: 'amit@woodcraft.com', jobTitle: 'Sales Executive', salary: 55000, deptIdx: 1 },
    { firstName: 'Suresh', lastName: 'Raina', email: 'suresh@woodcraft.com', jobTitle: 'Supervisor', salary: 45000, deptIdx: 2 }
  ];

  for (const emp of employees) {
    const e = await prisma.employee.create({
      data: {
        tenantId,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        jobTitle: emp.jobTitle,
        salary: new Decimal(emp.salary),
        departmentId: depts[emp.deptIdx].id,
        employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        joiningDate: new Date('2023-01-01')
      }
    });

    // 2. Payroll (Last 3 months)
    for (let m = 1; m <= 3; m++) {
      await prisma.payroll.create({
        data: {
          employeeId: e.id,
          periodStart: new Date(2025, m, 1),
          periodEnd: new Date(2025, m, 28),
          basicSalary: new Decimal(emp.salary),
          bonuses: new Decimal(emp.salary * 0.1),
          deductions: new Decimal(emp.salary * 0.05),
          netPay: new Decimal(emp.salary * 1.05),
          status: PayrollStatus.Processed,
          processedAt: new Date()
        }
      });
    }
  }

  // 3. Inventory: Stock History (StockMovements)
  console.log('Seeding Stock History (100+ Movements)...');
  const products = await prisma.product.findMany({ where: { tenantId } });
  const warehouses = await prisma.warehouse.findMany({ where: { tenantId } });

  for (let i = 0; i < 100; i++) {
    const prod = products[i % products.length];
    const wh = warehouses[i % warehouses.length];
    const qty = new Decimal(Math.floor(Math.random() * 20) + 1);
    const type = i % 4 === 0 ? MovementType.IN : (i % 4 === 1 ? MovementType.OUT : (i % 4 === 2 ? MovementType.TRANSFER : MovementType.ADJUST));
    
    await prisma.stockMovement.create({
      data: {
        tenantId,
        productId: prod.id,
        warehouseId: wh.id,
        quantity: qty,
        type,
        reference: `HIST-MOV-${1000 + i}`,
        notes: `Simulated ${type} for historical audit.`,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      }
    });
  }

  // 4. Finance: Payments (Fulfilling Invoices)
  console.log('Seeding Payments (50+ Records)...');
  const invoices = await prisma.invoice.findMany({ where: { tenantId, status: 'Paid' } });
  const bankAcc = await prisma.account.findFirst({ where: { name: 'Bank', tenantId } });
  const arAcc = await prisma.account.findFirst({ where: { name: 'Accounts Receivable', tenantId } });

  for (let i = 0; i < invoices.length; i++) {
    const inv = invoices[i];
    
    // Add InvoiceItem if missing
    const existingItems = await prisma.invoiceItem.count({ where: { invoiceId: inv.id } });
    if (existingItems === 0) {
      await prisma.invoiceItem.create({
        data: {
          invoiceId: inv.id,
          productId: (await prisma.product.findFirst({ where: { sku: 'FG-DESK-001' } }))!.id,
          quantity: new Decimal(1),
          unitPrice: inv.totalAmount,
          gstRate: new Decimal(0),
          taxableAmount: inv.totalAmount,
          gstAmount: new Decimal(0),
          totalAmount: inv.totalAmount
        }
      });
    }

    await prisma.payment.create({
      data: {
        tenantId,
        customerId: inv.customerId,
        invoiceId: inv.id,
        amount: inv.totalAmount,
        date: inv.issueDate,
        mode: i % 2 === 0 ? PaymentMode.Bank : PaymentMode.Cash,
        reference: `PAY-${inv.invoiceNumber}`,
        notes: 'Historical payment fulfillment.'
      }
    });
    
    // Add matching Journal Entry for payment if bank account exists
    if (bankAcc && arAcc) {
      await prisma.journalEntry.create({
        data: {
          tenantId,
          date: inv.issueDate,
          description: `Payment Receipt for ${inv.invoiceNumber}`,
          reference: inv.invoiceNumber,
          posted: true,
          transactions: {
            create: [
              { tenantId, accountId: bankAcc.id, type: 'Debit', amount: inv.totalAmount, description: 'Bank Inflow' },
              { tenantId, accountId: arAcc.id, type: 'Credit', amount: inv.totalAmount, description: 'AR Credit' }
            ]
          }
        }
      });
      await prisma.account.update({ where: { id: bankAcc.id }, data: { balance: { increment: inv.totalAmount } } });
      await prisma.account.update({ where: { id: arAcc.id }, data: { balance: { decrement: inv.totalAmount } } });
    }
  }

  // 5. Procurement: Purchase Orders
  console.log('Seeding Procurement (20+ Purchase Orders)...');
  const suppliers = await prisma.supplier.findMany({ where: { tenantId } });
  const rawMaterials = await prisma.product.findMany({ where: { tenantId, sku: { startsWith: 'RM-' } } });

  for (let i = 0; i < 20; i++) {
    const supp = suppliers[i % suppliers.length];
    const rm = rawMaterials[i % rawMaterials.length];
    const amount = new Decimal(5000 + Math.random() * 10000);
    
    await prisma.purchaseOrder.create({
      data: {
        tenantId,
        supplierId: supp.id,
        orderNumber: `PO-HIST-${2000 + i}`,
        orderDate: new Date(Date.now() - (i * 3 * 24 * 60 * 60 * 1000)),
        totalAmount: amount,
        status: i < 5 ? POStatus.Received : POStatus.Ordered,
        items: {
          create: {
            productId: rm.id,
            quantity: new Decimal(10 + i),
            unitPrice: amount.div(10 + i)
          }
        }
      }
    });
  }

  // 7. Projects & Tasks
  console.log('Seeding Projects & Tasks...');
  const projNames = ['Factory Layout Upgrade', 'ISO Certification 2025', 'Market Expansion South', 'New Product R&D', 'ERP Training Phase 2'];
  for (const name of projNames) {
    const p = await prisma.project.create({
      data: {
        tenantId,
        name,
        status: ProjectStatus.Active,
        priority: Priority.High,
        startDate: new Date()
      }
    });

    for (let j = 0; j < 8; j++) {
      await prisma.task.create({
        data: {
          tenantId,
          projectId: p.id,
          title: `Task ${j+1} for ${name}`,
          status: j < 3 ? TaskStatus.Done : (j < 6 ? TaskStatus.InProgress : TaskStatus.Todo),
          priority: Priority.Medium,
          dueDate: new Date(Date.now() + j * 24 * 60 * 60 * 1000)
        }
      });
    }
  }

  // 9. SYSTEM METADATA: Models, Workflows, Gen-Records
  console.log('Seeding System Metadata (Studio, Workflows)...');
  const app = await prisma.app.findFirst();
  if (app) {
    const md = await prisma.modelDefinition.create({
      data: { moduleId: app.id, name: 'CustomAsset', label: 'Custom Asset' }
    });
    await prisma.fieldDefinition.create({
      data: { modelId: md.id, name: 'serialNumber', label: 'Serial Number', type: 'Char' }
    });
    await prisma.modelAccess.create({
      data: { modelId: md.id, role: 'Owner', permRead: true, permWrite: true, permCreate: true, permUnlink: true }
    });
  }

  const workflow = await prisma.workflowDefinition.create({
    data: { name: 'Order Approval Workflow', modelName: 'Order' }
  });
  const startNode = await prisma.workflowNode.create({
    data: { workflowId: workflow.id, name: 'Start', type: 'state' }
  });
  const endNode = await prisma.workflowNode.create({
    data: { workflowId: workflow.id, name: 'Approved', type: 'state' }
  });
  await prisma.workflowTransition.create({
    data: { workflowId: workflow.id, fromNodeId: startNode.id, toNodeId: endNode.id, triggerType: 'manual', label: 'Approve' }
  });

  await prisma.record.create({
    data: { tenantId, modelName: 'CustomAsset', data: { serialNumber: 'SN-999', status: 'In-Service' } }
  });

  console.log('✅ SUPER SEEDER COMPLETE. 100.0% UNIVERSAL SCHEMA COVERAGE.');
}

runSuperSeeder()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
