
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CrmService } from '../src/crm/crm.service';
import { PrismaService } from '../src/prisma/prisma.service';

async function runVerification() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const crm = app.get(CrmService);

  console.log('🚀 Starting Block E: CRM & Customer Logic Verification...');

  // Setup: Get a Tenant
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error('No tenant found');
  const tenantId = tenant.id;
  console.log(`Using Tenant: ${tenant.name} (${tenantId})`);

  // --- CRM-01: Walk-In Guard ---
  console.log('\n--- Verifying CRM-01: Walk-In Guard ---');
  const walkIn = await crm.ensureWalkInCustomer(tenantId);
  console.log(`Walk-In Customer ID: ${walkIn.id}`);

  try {
      await crm.deleteCustomer(tenantId, walkIn.id);
      throw new Error('CRM-01 Fail: Deleted Walk-In Customer');
  } catch (e) {
      if (e.message.includes('System protected')) {
          console.log('✅ CRM-01 Passed: Walk-In deletion blocked.');
      } else {
          throw new Error(`CRM-01 Unexpected Error: ${e.message}`);
      }
  }

  // --- CRM-02: Data Quality ---
  console.log('\n--- Verifying CRM-02: Data Quality ---');
  try {
      await crm.createCustomer(tenantId, {
          firstName: 'Jo', // Too short
          email: `jo-${Date.now()}@test.com`
      });
      throw new Error('CRM-02 Fail: Created customer with short name');
  } catch (e) {
      if (e.message.includes('at least 3 characters')) {
          console.log('✅ CRM-02 Passed: Name validation enforced.');
      } else {
          throw new Error(`CRM-02 Unexpected Error: ${e.message}`);
      }
  }

  // --- CRM-03: Unpaid Guard ---
  console.log('\n--- Verifying CRM-03: Unpaid Guard ---');
  // 1. Create Customer
  const customer = await crm.createCustomer(tenantId, {
      firstName: 'Debtor',
      lastName: 'Doe',
      email: `debtor-${Date.now()}@test.com`,
      phone: '0000000000'
  });

  // 2. Create Unpaid Invoice
  await prisma.invoice.create({
      data: {
          tenantId,
          customerId: customer.id,
          invoiceNumber: `INV-${Date.now()}`,
          totalAmount: 100,
          dueDate: new Date(),
          status: 'Unpaid'
      }
  });

  // 3. Attempt Delete
  try {
      await crm.deleteCustomer(tenantId, customer.id);
      throw new Error('CRM-03 Fail: Deleted customer with unpaid invoice');
  } catch (e) {
      if (e.message.includes('outstanding invoices')) {
          console.log('✅ CRM-03 Passed: Debtor deletion blocked.');
      } else {
          throw new Error(`CRM-03 Unexpected Error: ${e.message}`);
      }
  }

  // --- CRM-04: CSV Import ---
  console.log('\n--- Verifying CRM-04: CSV Import ---');
  const csvData = `firstName,email,gstin`; // Missing state
  const csvContent = `${csvData}\nValid Name,valid-${Date.now()}@test.com,29ABCDE1234F1Z5`;
  
  const result = await crm.importCustomers(tenantId, csvContent);
  // Check validation warning logic?
  // Actually, looking at crm.service.ts import logic:
  // It checks: if (gstin && !state) results.errors.push warning.
  // BUT it might still import? 
  // Let's check results.errors.

  const warning = result.errors.find(e => e.includes('GSTIN provided but State missing'));
  if (warning) {
      console.log('✅ CRM-04 Passed: GSTIN/State mismatch warning generated.');
  } else {
      // If no warning, maybe logic changed or my csv is wrong?
      // Re-reading service: 
      // const stateIdx = headers.indexOf('state'); 
      // const state = stateIdx > -1 ? cols[stateIdx] : null;
      // if (gstin && !state) -> push warning.
      // My CSV header DOES NOT have 'state'. So stateIdx is -1. State is null.
      // GSTIN is present.
      // So warning SHOULD function.
      console.log('CSV Results:', JSON.stringify(result, null, 2));
      throw new Error('CRM-04 Fail: No warning for missing state with GSTIN');
  }

  console.log('\n🎉 Block E Verification COMPLETED SUCCESSFULLY.');
  await app.close();
}

runVerification().catch(err => {
  console.error('❌ Verification Failed:', err);
  process.exit(1);
});
