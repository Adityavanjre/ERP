
import { PrismaClient, POStatus, MovementType } from '@prisma/client';
import { PurchasesService } from '../src/purchases/purchases.service';
import { PrismaService } from '../src/prisma/prisma.service';

// Mock PrismaService to just be the PrismaClient
class MockPrismaService extends PrismaClient {}

async function main() {
  console.log('🏭 Verifying Multi-Warehouse Purchasing Logic...');
  const prisma = new MockPrismaService();
  const service = new PurchasesService(prisma as any);

  // 1. Setup Data
  const tenant = await prisma.tenant.findUnique({ where: { slug: 'woodcraft' } });
  if (!tenant) throw new Error('Tenant not found');

  const supplier = await prisma.supplier.findFirst({ where: { tenantId: tenant.id } });
  if (!supplier) throw new Error('Supplier not found');

  const product = await prisma.product.findFirst({ where: { tenantId: tenant.id, sku: 'RM-VAR-001' } }); // Varnish
  if (!product) throw new Error('Product Varnish not found');
  
  const initialStock = Number(product.stock);
  console.log(`📦 Initial Stock for ${product.name}: ${initialStock}`);

  // 2. Create Purchase Order (Simulation)
  const po = await prisma.purchaseOrder.create({
    data: {
      tenantId: tenant.id,
      supplierId: supplier.id,
      orderNumber: `PO-WH-TEST-${Date.now()}`,
      status: POStatus.Ordered,
      totalAmount: 12000,
      items: {
        create: {
          productId: product.id,
          quantity: 10,
          unitPrice: 1200,
        }
      }
    }
  });
  console.log(`📝 Created PO: ${po.orderNumber} (Qty: 10)`);

  // 3. Execute Service Logic (The Test Target)
  console.log('🔄 Executing updatePOStatus(Received)...');
  try {
    await service.updatePOStatus(tenant.id, po.id, POStatus.Received);
    console.log('✅ Service execution successful');
  } catch (e) {
    console.error('❌ Service execution failed:', e);
    process.exit(1);
  }

  // 4. Verify Results
  
  // A. Global Stock
  const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
  console.log(`📦 New Stock: ${updatedProduct?.stock}`);
  if (Number(updatedProduct?.stock) !== initialStock + 10) {
    console.error('❌ Global Stock mismatch!');
  } else {
    console.log('✅ Global Stock updated correctly');
  }

  // B. Warehouse Stock
  const stockLoc = await prisma.stockLocation.findFirst({
    where: {
      productId: product.id,
      warehouse: { name: 'Main Factory Warehouse' }
    },
    include: { warehouse: true }
  });

  if (stockLoc) {
    console.log(`🏭 Warehouse Stock (${stockLoc.warehouse.name}): ${stockLoc.quantity}`);
    if (Number(stockLoc.quantity) >= 10) {
       console.log('✅ Warehouse stock present');
    } else {
       console.error('❌ Warehouse stock too low/not updated');
    }
  } else {
    console.error('❌ No StockLocation found for Main Factory Warehouse!');
  }

  // C. Stock Movement Log
  const movement = await prisma.stockMovement.findFirst({
    where: {
      tenantId: tenant.id,
      productId: product.id,
      reference: po.orderNumber,
      type: MovementType.IN
    }
  });

  if (movement) {
    console.log(`📜 Audit Log found: IN ${movement.quantity} (Ref: ${movement.reference})`);
    console.log('✅ Stock Movement Audit verified');
  } else {
    console.error('❌ No StockMovement audit log found!');
  }

  await prisma.$disconnect();
}

main();
