
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PurchasesService } from '../src/purchases/purchases.service';
import { InventoryService } from '../src/inventory/inventory.service';
import { POStatus } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';

async function runVerification() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const purchases = app.get(PurchasesService);

  console.log('🚀 Starting Block B: Procurement & Warehousing Verification...');

  // Setup: Get a Tenant
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error('No tenant found');
  const tenantId = tenant.id;
  console.log(`Using Tenant: ${tenant.name} (${tenantId})`);

  // --- PUR-01: RFQ Conversion ---
  console.log('\n--- Verifying PUR-01: RFQ Conversion ---');
  const supplier = await prisma.supplier.create({
    data: { tenantId, name: `RFQ Supplier ${Date.now()}`, email: `rfq-${Date.now()}@test.com` }
  });

  const product = await prisma.product.create({
    data: {
      tenantId,
      name: `RFQ Product ${Date.now()}`,
      sku: `RFQ-${Date.now()}`,
      costPrice: 50,
      stock: 0,
    }
  });

  const rfq = await purchases.createPurchaseOrder(tenantId, {
    supplierId: supplier.id,
    orderNumber: `RFQ-${Date.now()}`,
    orderDate: new Date(),
    expectedDate: new Date(),
    items: [{ productId: product.id, quantity: 10, unitPrice: 50 }],
    totalAmount: 500,
    status: 'RFQ' as POStatus // Casting strictly
  });
  console.log(`Created RFQ: ${rfq.orderNumber} (Status: ${rfq.status})`);

  if (rfq.status !== 'RFQ') throw new Error('RFQ Creation Failed: Status not RFQ');

  // Convert to Order
  await purchases.convertRFQToPO(tenantId, rfq.id);
  const po = await prisma.purchaseOrder.findUnique({ where: { id: rfq.id } });
  
  if (!po) throw new Error('PO not found after conversion');
  if (po.status !== POStatus.Ordered) throw new Error(`RFQ Conversion Fail: Expected Ordered, got ${po.status}`);
  console.log('✅ PUR-01 Passed: RFQ converted to Ordered.');


  // --- PUR-02: Supplier Balance Migration ---
  console.log('\n--- Verifying PUR-02: Supplier Balance Migration ---');
  const supplier2 = await purchases.createSupplier(tenantId, {
    name: `Balance Supplier ${Date.now()}`,
    email: `bal-${Date.now()}@test.com`,
    openingBalance: 1500
  });

  const balanceRecord = await prisma.supplierOpeningBalance.findFirst({
    where: { tenantId, supplierId: supplier2.id }
  });

  if (!balanceRecord || Number(balanceRecord.amount) !== 1500) {
      throw new Error('PUR-02 Fail: Opening Balance record missing or incorrect.');
  }
  console.log('✅ PUR-02 Passed: Supplier Opening Balance recorded.');


  // --- PUR-03: Multi-Warehouse Reception ---
  console.log('\n--- Verifying PUR-03: Multi-Warehouse Reception ---');
  // 1. Create a secondary warehouse
  const warehouseB = await prisma.warehouse.create({
    data: { tenantId, name: `Warehouse B - ${Date.now()}`, location: 'Remote Site' }
  });
  console.log(`Created Warehouse B: ${warehouseB.name}`);

  // 2. Create PO
  const poMulti = await purchases.createPurchaseOrder(tenantId, {
    supplierId: supplier.id,
    orderNumber: `PO-MULTI-${Date.now()}`,
    orderDate: new Date(),
    expectedDate: new Date(),
    items: [{ productId: product.id, quantity: 50, unitPrice: 50 }], // 50 items
    totalAmount: 2500
  });

  // 3. Receive into Warehouse B
  await purchases.updatePOStatus(tenantId, poMulti.id, POStatus.Received, warehouseB.id);

  // 4. Verify Stock Location
  const stockLoc = await prisma.stockLocation.findUnique({
    where: {
      productId_warehouseId: { productId: product.id, warehouseId: warehouseB.id }
    }
  });

  if (!stockLoc || Number(stockLoc.quantity) !== 50) {
      throw new Error(`PUR-03 Fail: Stock not found in Warehouse B. Found: ${stockLoc?.quantity}`);
  }
  console.log('✅ PUR-03 Passed: Stock received in Warehouse B.');

  console.log('\n🎉 Block B Verification COMPLETED SUCCESSFULLY.');
  await app.close();
}

runVerification().catch(err => {
  console.error('❌ Verification Failed:', err);
  process.exit(1);
});
