import { PrismaClient, BOMStatus, WorkOrderStatus, Priority, MachineStatus, CustomerStatus, Stage, MovementType, InvoiceStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

const tenantId = '3a9b95f8-941d-4c24-8531-c6e242729300';
const userId = '68839433-c7e9-4342-9512-cd62c7ec0587';

async function main() {
    console.log('--- SEEDING MANUFACTURING DEMO DATA ---');

    // 1. Warehouses
    const whPlant = await prisma.warehouse.create({
        data: {
            tenantId,
            name: 'Manufacturing Plant',
            location: 'Plot 42, Textile Zone',
        }
    });

    const whRaw = await prisma.warehouse.create({
        data: {
            tenantId,
            name: 'Raw Materials Warehouse',
            location: 'North Wing, Level 1',
        }
    });

    // 2. Products (Raw Materials)
    const rmFabric = await prisma.product.create({
        data: {
            tenantId,
            name: 'Premium Chiffon Fabric (Black)',
            sku: 'RM-CH-001',
            category: 'Raw Materials',
            baseUnit: 'Meters',
            costPrice: new Decimal(450),
            price: new Decimal(0),
            stock: new Decimal(500),
            createdById: userId,
        }
    });

    const rmZipper = await prisma.product.create({
        data: {
            tenantId,
            name: 'YKK Invisible Zipper (20")',
            sku: 'RM-ZP-002',
            category: 'Accessories',
            baseUnit: 'Pieces',
            costPrice: new Decimal(25),
            price: new Decimal(0),
            stock: new Decimal(1000),
            createdById: userId,
        }
    });

    const rmThread = await prisma.product.create({
        data: {
            tenantId,
            name: 'High-Tenacity Silk Thread',
            sku: 'RM-TH-003',
            category: 'Raw Materials',
            baseUnit: 'Rolls',
            costPrice: new Decimal(120),
            price: new Decimal(0),
            stock: new Decimal(200),
            createdById: userId,
        }
    });

    // 3. Finished Good
    const fgGown = await prisma.product.create({
        data: {
            tenantId,
            name: 'Royal Chiffon Evening Gown',
            sku: 'FG-GWN-001',
            category: 'Finished Goods',
            baseUnit: 'Pieces',
            costPrice: new Decimal(1850),
            price: new Decimal(4500),
            stock: new Decimal(12),
            createdById: userId,
        }
    });

    // 4. BOM
    const bom = await prisma.billOfMaterial.create({
        data: {
            tenantId,
            name: 'Royal Gown Assembly Recipe',
            productId: fgGown.id,
            quantity: 1,
            overheadRate: new Decimal(15),
            status: BOMStatus.Active,
            items: {
                create: [
                    { tenantId, productId: rmFabric.id, quantity: new Decimal(3.5), unit: 'Meters' },
                    { tenantId, productId: rmZipper.id, quantity: new Decimal(1.0), unit: 'Pieces' },
                    { tenantId, productId: rmThread.id, quantity: new Decimal(0.1), unit: 'Rolls' },
                ]
            }
        }
    });

    // 5. Machines
    const m1 = await prisma.machine.create({
        data: {
            tenantId,
            name: 'Computerized Cutting Table',
            code: 'CUT-01',
            type: 'Cutting',
            status: MachineStatus.Idle,
            hourlyRate: new Decimal(250),
        }
    });

    const m2 = await prisma.machine.create({
        data: {
            tenantId,
            name: 'High-Speed Stitching Machine',
            code: 'ST-A4',
            type: 'Stitching',
            status: MachineStatus.Running,
            hourlyRate: new Decimal(150),
        }
    });

    // 6. Work Orders
    await prisma.workOrder.create({
        data: {
            tenantId,
            orderNumber: 'WO-2024-001',
            bomId: bom.id,
            quantity: new Decimal(10),
            producedQuantity: new Decimal(10),
            status: WorkOrderStatus.Completed,
            priority: Priority.Medium,
            startDate: new Date(),
            endDate: new Date(),
            operatorName: 'Suresh Kumar',
            machineId: m1.id,
        }
    });

    await prisma.workOrder.create({
        data: {
            tenantId,
            orderNumber: 'WO-2024-002',
            bomId: bom.id,
            quantity: new Decimal(25),
            producedQuantity: new Decimal(5),
            status: WorkOrderStatus.InProgress,
            priority: Priority.High,
            startDate: new Date(),
            operatorName: 'Anita Sharma',
            machineId: m2.id,
        }
    });

    // 7. CRM - Customers
    const custWestside = await prisma.customer.create({
        data: {
            tenantId,
            company: 'Westside Retail Ltd',
            email: 'procurement@westside.co.in',
            phone: '+91 9820012345',
            firstName: 'Rahul',
            lastName: 'Khanna',
            status: CustomerStatus.Customer,
        }
    });

    // 8. CRM - Opportunity
    await prisma.opportunity.create({
        data: {
            tenantId,
            title: 'Monsoon Collection 2024 Order',
            value: new Decimal(500000),
            stage: Stage.Proposal,
            probability: 60,
            customerId: custWestside.id,
            expectedClose: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }
    });

    // 9. Stock Movements
    await prisma.stockMovement.create({
        data: {
            tenantId,
            productId: rmFabric.id,
            warehouseId: whRaw.id,
            quantity: new Decimal(100),
            type: MovementType.IN,
            notes: 'Initial Bulk Purchase',
            reference: 'PO-PUR-001',
        }
    });

    // 10. Invoices (Last 30 days)
    await prisma.invoice.create({
        data: {
            tenantId,
            customerId: custWestside.id,
            invoiceNumber: 'INV-CF-2401',
            issueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            totalAmount: new Decimal(53100),
            amountPaid: new Decimal(53100),
            totalTaxable: new Decimal(45000),
            totalGST: new Decimal(8100),
            status: InvoiceStatus.Paid,
        }
    });

    console.log('--- SEEDING COMPLETE ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
