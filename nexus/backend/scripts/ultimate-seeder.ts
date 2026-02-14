import { PrismaClient, MovementType, PaymentMode, EmployeeStatus, LeaveType, PayrollStatus, ProjectStatus, Priority, TaskStatus, OrderStatus, POStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function runSuperSeeder() {
  console.log('🌟 STARTING ULTIMATE SUPER SEEDER (100% Universal Coverage)...');

  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error('Tenant not found. Run master-seeder first.');
  const tenantId = tenant.id;

  // --- CLEANUP ---
  console.log('Cleaning up all dynamic data for 100% clean simulation...');
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
  await prisma.invoiceItem.deleteMany({ where: { invoice: { tenantId } } });
  await prisma.auditLog.deleteMany({ where: { tenantId } });
  await prisma.periodLock.deleteMany({ where: { tenantId } });
  await prisma.customerOpeningBalance.deleteMany({ where: { tenantId } });
  await prisma.record.deleteMany({ where: { tenantId } });
  await prisma.workflowTransition.deleteMany({});
  await prisma.workflowNode.deleteMany({});
  await prisma.workflowDefinition.deleteMany({});
  await prisma.fieldDefinition.deleteMany({});
  await prisma.modelAccess.deleteMany({});
  await prisma.modelDefinition.deleteMany({});

  // 1. HR: Departments & Employees
  console.log('Seeding HR...');
  const deptNames = ['Executive', 'Sales', 'Manufacturing', 'Accounts', 'Logistics', 'HR'];
  const depts = [];
  for (const name of deptNames) {
    depts.push(await prisma.department.create({ data: { name, tenantId } }));
  }

  const employeeData = [
    { firstName: 'Rajesh', lastName: 'Kumar', email: 'rajesh@woodcraft.com', jobTitle: 'CEO', salary: 250000, deptIdx: 0 },
    { firstName: 'Anita', lastName: 'Desai', email: 'anita@woodcraft.com', jobTitle: 'Sales Head', salary: 120000, deptIdx: 1 },
    { firstName: 'Vijay', lastName: 'Singh', email: 'vijay@woodcraft.com', jobTitle: 'Plant Manager', salary: 90000, deptIdx: 2 },
    { firstName: 'Sunita', lastName: 'Iyer', email: 'sunita@woodcraft.com', jobTitle: 'Chief Accountant', salary: 110000, deptIdx: 3 }
  ];

  for (const emp of employeeData) {
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
    await prisma.payroll.create({
      data: { employeeId: e.id, periodStart: new Date(), periodEnd: new Date(), basicSalary: new Decimal(emp.salary), netPay: new Decimal(emp.salary), status: PayrollStatus.Processed }
    });
    await prisma.leave.create({
      data: { employeeId: e.id, type: LeaveType.Sick, startDate: new Date(), endDate: new Date(), status: 'Approved' }
    });
  }

  // 2. Inventory: Stock Movements
  console.log('Seeding Inventory...');
  const products = await prisma.product.findMany({ where: { tenantId } });
  const warehouses = await prisma.warehouse.findMany({ where: { tenantId } });
  for (let i = 0; i < 20; i++) {
    await prisma.stockMovement.create({
      data: { tenantId, productId: products[i % products.length].id, warehouseId: warehouses[i % warehouses.length].id, quantity: new Decimal(5), type: MovementType.IN, reference: `GEN-MOV-${i}` }
    });
  }

  // 3. Sales & Payments
  console.log('Seeding Sales...');
  const invoices = await prisma.invoice.findMany({ where: { tenantId } });
  for (const inv of invoices) {
    await prisma.invoiceItem.create({ data: { invoiceId: inv.id, productId: products[0].id, quantity: new Decimal(1), unitPrice: inv.totalAmount, gstRate: new Decimal(0), taxableAmount: inv.totalAmount, gstAmount: new Decimal(0), totalAmount: inv.totalAmount } });
    await prisma.payment.create({ data: { tenantId, customerId: inv.customerId, invoiceId: inv.id, amount: inv.totalAmount, date: new Date(), mode: PaymentMode.Bank, reference: `PAY-${inv.invoiceNumber}` } });
  }

  // 4. Procurement
  console.log('Seeding Procurement...');
  const suppliers = await prisma.supplier.findMany({ where: { tenantId } });
  for (let i = 0; i < 5; i++) {
    await prisma.purchaseOrder.create({
      data: {
        tenantId,
        supplierId: suppliers[i % suppliers.length].id,
        orderNumber: `PO-AUTO-${i}`,
        totalAmount: new Decimal(1000),
        status: POStatus.Ordered,
        items: { create: { productId: products[0].id, quantity: new Decimal(1), unitPrice: new Decimal(1000) } }
      }
    });
  }

  // 5. System Metadata
  console.log('Seeding System Metadata...');
  const app = await prisma.app.findFirst();
  if (app) {
    const md = await prisma.modelDefinition.create({ data: { moduleId: app.id, name: 'DynamicAsset', label: 'Dynamic Asset' } });
    await prisma.fieldDefinition.create({ data: { modelId: md.id, name: 'tag', label: 'Tag', type: 'Char' } });
    await prisma.modelAccess.create({ data: { modelId: md.id, role: 'Owner', permRead: true, permWrite: true, permCreate: true, permUnlink: true } });
    await prisma.record.create({ data: { tenantId, modelName: 'DynamicAsset', data: { tag: 'TEST-001' } } });
  }
  const wf = await prisma.workflowDefinition.create({ data: { name: 'Auto Pipeline', modelName: 'Order' } });
  const n1 = await prisma.workflowNode.create({ data: { workflowId: wf.id, name: 'Start', type: 'state' } });
  const n2 = await prisma.workflowNode.create({ data: { workflowId: wf.id, name: 'End', type: 'state' } });
  await prisma.workflowTransition.create({ data: { workflowId: wf.id, fromNodeId: n1.id, toNodeId: n2.id, triggerType: 'auto' } });

  // 6. Projects & Tasks
  console.log('Seeding Projects & Tasks...');
  const p = await prisma.project.create({ data: { tenantId, name: 'Factory Upgrade 2025', status: ProjectStatus.Active, priority: Priority.High, startDate: new Date() } });
  for (let i = 0; i < 10; i++) {
    await prisma.task.create({ data: { tenantId, projectId: p.id, title: `Task ${i+1}`, status: TaskStatus.Todo, priority: Priority.Medium } });
  }

  // 7. Audit Logs, Locks, Balances
  console.log('Seeding Audit & Balance history...');
  for (let i = 0; i < 10; i++) {
    await prisma.auditLog.create({ data: { tenantId, action: 'SYSTEM_AUDIT', resource: 'DATABASE', details: { status: 'OK' } } });
  }
  await prisma.periodLock.create({ data: { tenantId, month: 2, year: 2025, isLocked: false } });
  const customers = await prisma.customer.findMany({ where: { tenantId }, take: 1 });
  for (const c of customers) {
    await prisma.customerOpeningBalance.create({ data: { tenantId, customerId: c.id, amount: new Decimal(5000) } });
  }

  console.log('✅ ULTIMATE SEEDER COMPLETE. 100.0% UNIVERSAL COVERAGE.');
}

runSuperSeeder().catch(console.error).finally(() => prisma.$disconnect());
