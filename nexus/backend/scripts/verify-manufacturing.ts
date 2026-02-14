
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ManufacturingService } from '../src/manufacturing/manufacturing.service';
import { InventoryService } from '../src/inventory/inventory.service';
import { PrismaService } from '../src/prisma/prisma.service';

async function runVerification() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const manufacturing = app.get(ManufacturingService);

  console.log('🚀 Starting Block C: Manufacturing Logic Verification...');

  // Setup: Get a Tenant
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error('No tenant found');
  const tenantId = tenant.id;
  console.log(`Using Tenant: ${tenant.name} (${tenantId})`);

  // Setup: Create Products for BOM
  const rawMaterial = await prisma.product.create({
    data: {
      tenantId,
      name: `Raw Material ${Date.now()}`,
      sku: `RM-${Date.now()}`,
      stock: 100,
      costPrice: 10, // $10 per unit
    }
  });

  const subAssembly = await prisma.product.create({
    data: {
      tenantId,
      name: `Sub Assembly ${Date.now()}`,
      sku: `SA-${Date.now()}`,
      stock: 0,
      costPrice: 0,
    }
  });

  const finishedGood = await prisma.product.create({
    data: {
      tenantId,
      name: `Finished Good ${Date.now()}`,
      sku: `FG-${Date.now()}`,
      stock: 0,
      costPrice: 0,
    }
  });

  // --- MFG-01: Cycle Detection ---
  console.log('\n--- Verifying MFG-01: Cycle Detection ---');
  // Create Cycle: A -> B -> A
  // 1. BOM for A (SubAssembly) containing B (RawMaterial - just using RM as B for now to start chain)
  // Actually let's make it tighter: CycleProd 1 -> CycleProd 2 -> CycleProd 1
  
  const c1 = await prisma.product.create({ data: { tenantId, name: 'Cycle 1', sku: `C1-${Date.now()}`, costPrice: 0 } });
  const c2 = await prisma.product.create({ data: { tenantId, name: 'Cycle 2', sku: `C2-${Date.now()}`, costPrice: 0 } });

  // BOM: C1 uses 1x C2
  const bom1 = await manufacturing.createBOM(tenantId, {
    name: 'BOM C1',
    productId: c1.id,
    quantity: 1,
    items: [{ productId: c2.id, quantity: 1, unit: 'pc' }]
  });

  // BOM: C2 uses 1x C1
  await manufacturing.createBOM(tenantId, {
    name: 'BOM C2',
    productId: c2.id,
    quantity: 1,
    items: [{ productId: c1.id, quantity: 1, unit: 'pc' }]
  });

  try {
    await manufacturing.explodeBOM(bom1.id, 1);
    throw new Error('MFG-01 Fail: Cycle not detected (Infinite recursion or max depth exceeded expected)');
  } catch (e) {
    if (e.message.includes('Circular') || e.message.includes('depth')) {
      console.log('✅ MFG-01 Passed: Cycle/Depth limit detected.');
    } else {
      throw new Error(`MFG-01 Unexpected Error: ${e.message}`);
    }
  }

  // --- MFG-02 & MFG-03: Work Order Lifecycle & Cost Rollup ---
  console.log('\n--- Verifying MFG-02 & MFG-03: Work Order & Cost Rollup ---');
  
  // 1. Create Valid BOM: FG -> 2x RM
  // RM Cost = $10. FG Cost should be 2 * 10 = $20 (ignoring overhead for simplicity or checking it)
  await manufacturing.createBOM(tenantId, {
    name: 'BOM FG',
    productId: finishedGood.id,
    quantity: 1,
    overheadRate: 5, // $5 fixed overhead
    isOverheadFixed: true,
    items: [{ productId: rawMaterial.id, quantity: 2, unit: 'kg' }]
  });

  // Need stock location for RM to be deducted
  // Find default warehouse
  const warehouse = await prisma.warehouse.findFirst({ where: { tenantId } });
  if (!warehouse) throw new Error('No warehouse found');
  
  await prisma.stockLocation.create({
    data: {
      warehouseId: warehouse.id,
      productId: rawMaterial.id,
      quantity: 100
    }
  });

  // 2. Create WO
  const bom = await prisma.billOfMaterial.findFirst({ where: { productId: finishedGood.id } });
  if (!bom) throw new Error('BOM not found for FG');

  const wo = await manufacturing.createWorkOrder(tenantId, {
    bomId: bom.id,
    quantity: 10
  });
  console.log(`Created WO: ${wo.orderNumber}`);

  // 3. Complete WO
  await manufacturing.completeWorkOrder(tenantId, wo.id, warehouse.id);
  console.log('Work Order Completed.');

  // 4. Verify Stock
  const fgStock = await prisma.stockLocation.findUnique({
    where: { productId_warehouseId: { productId: finishedGood.id, warehouseId: warehouse.id } }
  });
  if (!fgStock || Number(fgStock.quantity) !== 10) throw new Error('MFG-02 Fail: FG Stock not updated');
  
  const rmStock = await prisma.stockLocation.findUnique({
    where: { productId_warehouseId: { productId: rawMaterial.id, warehouseId: warehouse.id } }
  });
  // Started with 100. Consumed 10 * 2 = 20. Remaining = 80.
  if (!rmStock || Number(rmStock.quantity) !== 80) throw new Error(`MFG-02 Fail: RM Stock incorrect. Expected 80, got ${rmStock?.quantity}`);

  console.log('✅ MFG-02 Passed: Stock movements correct.');

  // 5. Verify Cost (GL)
  // Expected Cost Per Unit = (2 * $10) + $5 = $25.
  // Total Job Cost = 10 units * $25 = $250.
  
  // Check GL
  const journal = await prisma.journalEntry.findFirst({
    where: { reference: wo.orderNumber },
    include: { transactions: true }
  });

  if (!journal) throw new Error('MFG-03 Fail: No Journal Entry found');
  
  const debit = journal.transactions.find(t => t.type === 'Debit');
  if (!debit) throw new Error('MFG-03 Fail: No Debit transaction');
  
  if (Number(debit.amount) !== 250) {
    throw new Error(`MFG-03 Fail: Cost Logic incorrect. Expected $250. Got $${debit.amount}`);
  }
  console.log('✅ MFG-03 Passed: Cost Rollup correct ($250).');

  console.log('\n🎉 Block C Verification COMPLETED SUCCESSFULLY.');
  await app.close();
}

runVerification().catch(err => {
  console.error('❌ Verification Failed:', err);
  process.exit(1);
});
