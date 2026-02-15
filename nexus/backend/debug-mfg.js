"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function debug() {
    const tenantId = (await prisma.tenant.findFirst())?.id;
    if (!tenantId) {
        console.error('No tenant found');
        return;
    }
    const wo = await prisma.workOrder.findFirst({
        where: { tenantId },
        include: { bom: { include: { product: true } } },
    });
    if (!wo) {
        console.error('No work order found');
        return;
    }
    console.log(`Debugging Work Order: ${wo.orderNumber} (ID: ${wo.id})`);
    try {
        await prisma.$transaction(async (tx) => {
            console.log('Starting transaction...');
            const requirements = [
                { productId: (await prisma.product.findFirst({ where: { sku: 'RM-TEAK-001' } }))?.id, productName: 'Teak Wood', quantity: 4 },
            ];
            for (const req of requirements) {
                console.log(`Deducting ${req.quantity} from ${req.productName}...`);
                const updateResult = await tx.product.updateMany({
                    where: {
                        id: req.productId,
                        stock: { gte: req.quantity },
                    },
                    data: { stock: { decrement: req.quantity } },
                });
                console.log(`Update result: ${updateResult.count}`);
            }
            console.log('Adding finished good...');
            await tx.product.update({
                where: { id: wo.bom.productId },
                data: { stock: { increment: wo.quantity } },
            });
            console.log('Updating Work Order status...');
            await tx.workOrder.update({
                where: { id: wo.id },
                data: { status: 'Completed', endDate: new Date() },
            });
            console.log('Creating Audit Log...');
            await tx.auditLog.create({
                data: {
                    tenantId,
                    action: 'PRODUCTION_COMPLETED',
                    resource: 'WorkOrder',
                    details: {
                        woNumber: wo.orderNumber,
                        productId: wo.bom.productId,
                        quantity: wo.quantity,
                    },
                },
            });
            console.log('Transaction success!');
        });
    }
    catch (err) {
        console.error('Transaction failed:', err);
    }
    finally {
        await prisma.$disconnect();
    }
}
debug();
//# sourceMappingURL=debug-mfg.js.map