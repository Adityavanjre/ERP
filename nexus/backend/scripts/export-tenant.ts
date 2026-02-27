import { PrismaClient, Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

async function exportTenantData(tenantId: string) {
    const prisma = new PrismaClient();
    const exportData: Record<string, any> = {};

    console.log(`Starting export for Tenant ID: ${tenantId}...`);

    // Get all model names from Prisma DMMF
    const models = (Prisma as any).dmmf.datamodel.models;

    for (const model of models) {
        const modelName = model.name;
        const lowerModelName = modelName.charAt(0).toLowerCase() + modelName.slice(1);

        // Skip global models (models without tenantId)
        const hasTenantId = model.fields.some((f: any) => f.name === 'tenantId');
        if (!hasTenantId) {
            console.log(`Skipping global model: ${modelName}`);
            continue;
        }

        try {
            console.log(`Exporting ${modelName}...`);
            const data = await (prisma as any)[lowerModelName].findMany({
                where: { tenantId: tenantId },
            });

            if (data.length > 0) {
                exportData[modelName] = data;
                console.log(`   - Exported ${data.length} records.`);
            }
        } catch (error) {
            console.error(`Error exporting ${modelName}:`, error.message);
        }
    }

    const exportDir = path.join(process.cwd(), 'backups', 'tenant-exports');
    if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
    }

    const filename = `tenant_${tenantId}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filePath = path.join(exportDir, filename);

    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));

    console.log(`\nExport complete!`);
    console.log(`File saved to: ${filePath}`);

    await prisma.$disconnect();
}

const tid = process.argv[2];
if (!tid) {
    console.error('Usage: ts-node scripts/export-tenant.ts <TENANT_ID>');
    process.exit(1);
}

exportTenantData(tid).catch(err => {
    console.error('Export failed:', err);
    process.exit(1);
});
