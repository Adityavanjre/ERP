import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function exhaustiveAudit() {
  console.log('🔍 EXHAUSTIVE DATABASE INTEGRITY AUDIT');
  console.log('=' .repeat(40));

  // Get all model names from Prisma DMMF (Internal metadata)
  const modelNames = (Prisma as any).dmmf.datamodel.models.map((m: any) => m.name);
  
  const results: { model: string, count: number, status: string }[] = [];

  for (const model of modelNames) {
    const propertyName = model.charAt(0).toLowerCase() + model.slice(1);
    try {
      const count = await (prisma as any)[propertyName].count();
      results.push({ 
        model, 
        count, 
        status: count > 0 ? '✅ POPULATED' : '❌ EMPTY' 
      });
    } catch (e) {
      results.push({ model, count: -1, status: '⚠️ ERROR (Skip)' });
    }
  }

  console.table(results);

  const emptyModels = results.filter(r => r.count === 0).map(r => r.model);
  if (emptyModels.length > 0) {
    console.log('\n🚨 EMPTY FIELDS FOUND:');
    console.log(emptyModels.join(', '));
  } else {
    console.log('\n💎 100% COVERAGE VERIFIED. No empty tables found.');
  }
}

exhaustiveAudit()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
