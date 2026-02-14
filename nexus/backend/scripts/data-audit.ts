import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function auditData() {
  const models = [
    'App', 'User', 'Tenant', 'Product', 'Customer', 'Opportunity', 'Order', 
    'AuditLog', 'BillOfMaterial', 'BOMItem', 'WorkOrder', 'Machine', 
    'Account', 'JournalEntry', 'Transaction', 'Invoice', 'InvoiceItem', 
    'Payment', 'Supplier', 'PurchaseOrder', 'PurchaseOrderItem', 
    'Warehouse', 'StockLocation', 'StockMovement',
    'Employee', 'Department', 'Payroll', 'Project', 'Task'
  ];

  console.log('--- DATABASE COVERAGE REPORT ---');
  for (const model of models) {
    try {
      const count = await (p as any)[model.charAt(0).toLowerCase() + model.slice(1)].count();
      console.log(`${model.padEnd(20)}: ${count} records`);
    } catch (e) {
      // Handle cases where model naming convention might differ or model is joined
    }
  }
}

auditData().finally(() => p.$disconnect());
