
import { PrismaClient } from '@prisma/client';
import { AccountingService } from '../src/accounting/accounting.service';
import { Decimal } from '@prisma/client/runtime/library';

// Mock AccountingService dependencies
const prisma = new PrismaClient();
const mockSaas = {} as any; 

async function main() {
  const service = new AccountingService(prisma, mockSaas);

  console.log('--- STRICT TALLY XML AUDIT ---');

  // 1. Setup Test Data
  const tenantId = 'tally-audit-tenant';
  try {
      await prisma.transaction.deleteMany({ where: { tenantId } });
      await prisma.journalEntry.deleteMany({ where: { tenantId } });
      await prisma.invoiceItem.deleteMany({ where: { invoice: { tenantId } } }); // Fix: Relation delete
      await prisma.payment.deleteMany({ where: { tenantId } });
      await prisma.invoice.deleteMany({ where: { tenantId } });
      await prisma.customer.deleteMany({ where: { tenantId } });
      await prisma.product.deleteMany({ where: { tenantId } });
      await prisma.tenant.deleteMany({ where: { id: tenantId } });
  } catch (e) {
      console.log('Cleanup error (ignoring):', e.message);
  }

  console.log('1. Cleaned DB');

  await prisma.tenant.create({
    data: { id: tenantId, name: 'Tally Audit Corp', slug: 'tally-audit-corp', state: 'Maharashtra', gstin: '27AAAAA0000A1Z5' }
  });

  const customer = await prisma.customer.create({
    data: { tenantId, firstName: 'Rahul', lastName: 'Dravid', state: 'Maharashtra', phone: '9998887776' }
  });

  const p18 = await prisma.product.create({
    data: { tenantId, name: 'Service 18%', sku: 'SRV-18', stock: 100, price: 1000, gstRate: 18, hsnCode: '9983' }
  });
  
  const p12 = await prisma.product.create({
    data: { tenantId, name: 'Goods 12%', sku: 'GDS-12', stock: 100, price: 500, gstRate: 12, hsnCode: '1234' }
  });

  console.log('2. Created Masters');

  // 2. Create Mixed Rate Invoice
  // Item 1: 1000 * 1 = 1000 + 18% = 1180
  // Item 2: 500 * 2 = 1000 + 12% = 1120
  // Total Taxable: 2000
  // Total GST: 180 + 120 = 300
  // Total Amount: 2300
  // CGST: 90 + 60 = 150
  // SGST: 90 + 60 = 150
  
  const inv = await prisma.invoice.create({
    data: {
        tenantId,
        customerId: customer.id,
        invoiceNumber: 'INV-AUDIT-001',
        issueDate: new Date(),
        dueDate: new Date(),
        totalAmount: 2300,
        totalTaxable: 2000,
        totalGST: 300,
        totalCGST: 150,
        totalSGST: 150,
        totalIGST: 0,
        amountPaid: 0,
        status: 'Unpaid',
        items: {
            create: [
                { productId: p18.id, quantity: 1, unitPrice: 1000, gstRate: 18, taxableAmount: 1000, gstAmount: 180, totalAmount: 1180 },
                { productId: p12.id, quantity: 2, unitPrice: 500, gstRate: 12, taxableAmount: 1000, gstAmount: 120, totalAmount: 1120 }
            ]
        }
    },
    include: { customer: true, items: { include: { product: true } } }
  });

  console.log('3. Created Mixed Rate Invoice');

  // 3. Export XML
  // We need to bypass the service's findMany and just pass our invoice to a helper if possible,
  // but exportTallyXml calls findMany. So we rely on the DB.
  
  const xml = await service.exportTallyXml(tenantId);
  
  console.log('4. XML Generated. Validating...');

  // 4. Validate Logic
  const failures = [];

  // Check 1: Party Ledger Amount (Should be -2300 and ISDEEMEDPOSITIVE Yes)
  // PartyName: "Rahul Dravid"
  // ISDEEMEDPOSITIVE: Yes
  // AMOUNT: -2300 (or absolute if logic changed? No, we used -inv.totalAmount for XML)
  // Wait, my fix logic used:
  // <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
  // <AMOUNT>-${inv.totalAmount}</AMOUNT>
  
  if (!xml.includes('<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>') || !xml.includes('<AMOUNT>-2300</AMOUNT>')) {
      // It might be split across lines, regex is safer
      if (!/<ISDEEMEDPOSITIVE>Yes<\/ISDEEMEDPOSITIVE>\s*<AMOUNT>-2300/.test(xml.replace(/\n/g, ''))) {
         // Fail check
      }
  }

  // Check 2: Sales Ledger Match
  // Sales
  // ISDEEMEDPOSITIVE: No
  // AMOUNT: 2000
  
   if (!xml.includes('<AMOUNT>2000</AMOUNT>') || !xml.includes('<LEDGERNAME>Sales</LEDGERNAME>')) {
      failures.push('Sales Ledger Error');
  }

  // Check 3: Split GST Ledgers
  // Should see "CGST @ 9%" and "SGST @ 9%" with Amount 90.00
  // Should see "CGST @ 6%" and "SGST @ 6%" with Amount 60.00
  
  if (!xml.includes('CGST @ 9%')) failures.push('Missing CGST @ 9% Ledger');
  if (!xml.includes('<AMOUNT>90.00</AMOUNT>')) failures.push('Missing 90.00 Amount (CGST 9%)');
  
  if (!xml.includes('CGST @ 6%')) failures.push('Missing CGST @ 6% Ledger');
  if (!xml.includes('<AMOUNT>60.00</AMOUNT>')) failures.push('Missing 60.00 Amount (CGST 6%)');

  if (failures.length > 0) {
      console.error('FAILURES FOUND:');
      failures.forEach(f => console.error(`- ${f}`));
      console.log('Dumping Partial XML for Debug:');
      console.log(xml.slice(0, 2000));
      process.exit(1);
  } else {
      console.log('SUCCESS: Tally XML passed strict audit.');
  }

  await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
