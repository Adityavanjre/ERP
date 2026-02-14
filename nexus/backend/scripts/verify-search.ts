
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { InventoryService } from '../src/inventory/inventory.service';
import { PrismaService } from '../src/prisma/prisma.service';

async function runVerification() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const inventory = app.get(InventoryService);

  console.log('🚀 Verifying INV-06: Barcode Search Priority...');

  // Setup: Get Tenant
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error('No tenant found');
  const tenantId = tenant.id;

  const timestamp = Date.now();
  const searchTerm = `998877-${timestamp}`;
  
  // Clean up previous runs if any? No, timestamp handles uniqueness.

  // 1. Create Test Products
  // Exact Match: Barcode = "998877-..."
  const exactMatch = await prisma.product.create({
      data: {
          tenantId,
          name: `Ambiguous Item`, 
          sku: `SKU-EXACT-${timestamp}`,
          barcode: searchTerm,
          stock: 10
      }
  });

  // Partial Match: Name contains "998877-..." (so it matches query)
  // Barcode is different.
  const partialMatch = await prisma.product.create({
      data: {
          tenantId,
          name: `Partial Match ${searchTerm} Item`, 
          sku: `SKU-PARTIAL-${timestamp}`,
          barcode: `OTHER-${timestamp}`,
          stock: 10
      }
  });

  console.log(`Created Exact Match: ${exactMatch.name} (Barcode: ${searchTerm})`);
  console.log(`Created Partial Match: ${partialMatch.name}`);

  // 2. Perform Search for the Barcode/Term
  console.log(`Searching for: "${searchTerm}"`);
  
  const results = await inventory.getProducts(tenantId, 1, 10, searchTerm);
  
  if (results.data.length < 2) {
      console.warn('Warning: expected at least 2 results, got', results.data.length);
  }

  const firstResult = results.data[0];
  console.log(`First Result: ${firstResult.sku} (Barcode: ${firstResult.barcode})`);

  if (firstResult.barcode === searchTerm) {
      console.log('✅ INV-06 Passed: Exact barcode match returned first.');
  } else {
      console.log('❌ INV-06 Fail: First result was NOT the exact barcode match.');
      console.log('First result ID:', firstResult.id);
      console.log('Exact ID:', exactMatch.id);
      throw new Error('INV-06 Verification Failed');
  }

  // 3. Verify Manual Search (Alternative)
  // Scenario: User types "Ambiguous" (part of the name). Should find the item even without barcode.
  console.log(`\nTesting Manual Search (Alternative) for: "Ambiguous"`);
  const manualResults = await inventory.getProducts(tenantId, 1, 10, "Ambiguous");
  
  const manualMatch = manualResults.data.find(p => p.id === exactMatch.id);
  if (manualMatch) {
      console.log('✅ Manual Entry Passed: Found item by partial name "Ambiguous".');
  } else {
      console.log('❌ Manual Entry Fail: Could not find item by partial name.');
      throw new Error('Manual Search Verification Failed');
  }

  console.log('\n🎉 Priority Search Verification COMPLETED SUCCESSFULLY.');
  await app.close();
}

runVerification().catch(err => {
  console.error('❌ Verification Failed:', err);
  process.exit(1);
});
