
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateTallyTestData(tenantId: string) {
    console.log(`🚀 Generating Tally Test Data for Tenant: ${tenantId}`);

    // 1. Ensure masters have GST/HSN/State
    await prisma.product.updateMany({
        where: { tenantId },
        data: { hsnCode: '8517', gstRate: 18.0 }
    });

    await prisma.customer.updateMany({
        where: { tenantId },
        data: { state: 'Karnataka' }
    });

    // 2. Create Interstate Customer
    const interstateCust = await prisma.customer.create({
        data: {
            tenantId,
            firstName: 'Global',
            lastName: 'Exports',
            state: 'Maharashtra', // Different state for IGST test
            phone: '9988776655',
            status: 'Active'
        }
    });

    console.log(`✅ Masters Prepared. Run your Tally Export now to verify IGST vs CGST/SGST splits.`);
}

// Usage: npx ts-node tally-seed.ts <tenant_id>
const tenantId = process.argv[2];
if (tenantId) {
    generateTallyTestData(tenantId);
} else {
    console.error("Please provide a Tenant ID");
}
