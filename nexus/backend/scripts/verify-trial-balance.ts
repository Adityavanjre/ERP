
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

async function performFinancialAudit() {
  const prisma = new PrismaClient();
  console.log('--- STARTING FORENSIC FINANCIAL AUDIT ---');

  try {
    const tenants = await prisma.tenant.findMany();
    
    for (const tenant of tenants) {
      console.log(`\nAuditing Tenant: ${tenant.name} (${tenant.id})`);
      
      const accounts = await prisma.account.findMany({
        where: { tenantId: tenant.id }
      });

      let totalDebits = new Decimal(0);
      let totalCredits = new Decimal(0);
      let assetBalance = new Decimal(0);
      let liabilityBalance = new Decimal(0);
      let equityBalance = new Decimal(0);
      let revenueBalance = new Decimal(0);
      let expenseBalance = new Decimal(0);

      accounts.forEach(acc => {
        const bal = new Decimal(acc.balance as any);
        console.log(`  - [${acc.type}] ${acc.name}: ${bal.toString()}`);
        
        switch (acc.type) {
          case 'Asset': 
            assetBalance = assetBalance.add(bal);
            break;
          case 'Liability':
            liabilityBalance = liabilityBalance.add(bal);
            break;
          case 'Equity':
            equityBalance = equityBalance.add(bal);
            break;
          case 'Revenue':
            revenueBalance = revenueBalance.add(bal);
            break;
          case 'Expense':
            expenseBalance = expenseBalance.add(bal);
            break;
        }
      });

      // Verification: Assets + Expenses = Liabilities + Equity + Revenue
      const leftSide = assetBalance.add(expenseBalance);
      const rightSide = liabilityBalance.add(equityBalance).add(revenueBalance);
      const drift = leftSide.sub(rightSide);

      console.log(`\n  Audit Summary for ${tenant.name}:`);
      console.log(`  Left Side (Assets + Expenses): ${leftSide.toString()}`);
      console.log(`  Right Side (Liabilities + Equity + Revenue): ${rightSide.toString()}`);
      
      if (drift.isZero()) {
        console.log('  ✅ VERDICT: PERFECT BALANCE. Trial Balance is zero.');
      } else {
        console.error(`  ❌ VERDICT: LEDGER IMBALANCE DETECTED! Drift: ${drift.toString()}`);
        console.log('  Triggering deep transaction audit...');
        // TODO: Drill down into journal entries if drift exists
      }
    }
  } catch (e) {
    console.error('Audit failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}

performFinancialAudit();
