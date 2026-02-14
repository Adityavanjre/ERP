
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { InventoryService } from '../src/inventory/inventory.service';
import { PrismaService } from '../src/prisma/prisma.service';

async function runVerification() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const inventory = app.get(InventoryService); // InventoryService likely has the search logic or we use Prisma directly if it's in controller

  console.log('🚀 Verifying INV-06: Barcode Search Priority...');

  // Setup: Get Tenant
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error('No tenant found');
  const tenantId = tenant.id;

  // 1. Create Test Products
  // Product A: Barcode = "12345", Name = "Apple iPhone"
  // Product B: Barcode = "99999", Name = "12345 Case" (Name contains barcode sequence)
  
  const timestamp = Date.now();
  const barcodeTarget = `998877-${timestamp}`;
  
  const exactMatch = await prisma.product.create({
      data: {
          tenantId,
          name: `Exact Match Item - ${timestamp}`,
          sku: `SKU-EXACT-${timestamp}`,
          barcode: barcodeTarget,
          stock: 10
      }
  });

  const partialMatch = await prisma.product.create({
      data: {
          tenantId,
          name: `Partial Match ${barcodeTarget} Item`, // Name contains the barcode
          sku: `SKU-PARTIAL-${timestamp}`,
          barcode: `OTHER-${timestamp}`,
          stock: 10
      }
  });

  console.log(`Created Exact Match: ${exactMatch.name} (Barcode: ${barcodeTarget})`);
  console.log(`Created Partial Match: ${partialMatch.name}`);

  // 2. Perform Search
  // We need to check how search is implemented. 
  // If it's via `InventoryService.findAll` with a search param, or specific search service.
  // Viewing `inventory.service.ts` or `search.service.ts` would be ideal, but assuming `getProducts` or similar has a search query.
  // Let's rely on Prisma 'OR' logic usually used in search.
  // But wait, I need to call the *Service* method that implements the logic to verify the *Application Logic*.
  
  // Checking InventoryService... I don't see a search method in previous view_file of InventoryService.
  // It might be in `InventoryController` calling `prisma.findMany`.
  // Or `SearchService`.
  
  // Let's try `inventory.getProducts` if it accepts a query.
  // Checking `inventory.service.ts` imports from previous turns... 
  // It has `createProduct`. `getProducts` is not fully visible in my memory but likely exists.
  // Let's blindly try `getProducts(tenantId, 1, 10, barcodeTarget)`. 
  // If TS fails, I'll see it.
  
  // Actually, to be safe, I'll check `InventoryService` implementation first in the same script? 
  // No, that's messy. 
  // I will check `InventoryService` signature in `verification-search.ts` by inspecting it?
  // No, I'll just assume standard pattern or check the file first. 
  // I'll pause this write to check the file.
}
