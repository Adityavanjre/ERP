import { PrismaClient, Role, TenantType, AccountType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
  console.log('🏭 Seeding Manufacturing ERP Data...');

  // Clean existing data for fresh start
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.stockLocation.deleteMany(); // Delete product-warehouse links
  await prisma.stockMovement.deleteMany();
  await prisma.bOMItem.deleteMany();
  await prisma.billOfMaterial.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.account.deleteMany();
  await prisma.tenantUser.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // 1. Create Tenant - Furniture Manufacturing Company
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Premium Woodcraft Industries',
      slug: 'woodcraft',
      type: TenantType.Manufacturing,
      address: 'Plot No. 45, Industrial Area Phase-2, Bangalore',
      state: 'Karnataka',
      gstin: '29AABCU9603R1ZM',
    },
  });

  console.log('✅ Created Tenant: Premium Woodcraft Industries');

  // 2. Create Users
  const ownerPassword = await bcrypt.hash('password123', 10);
  const owner = await prisma.user.create({
    data: {
      email: 'owner@woodcraft.com',
      passwordHash: ownerPassword,
      fullName: 'Rajesh Kumar',
      memberships: {
        create: {
          tenantId: tenant.id,
          role: Role.Owner,
        },
      },
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: 'manager@woodcraft.com',
      passwordHash: await bcrypt.hash('password123', 10),
      fullName: 'Priya Sharma',
      memberships: {
        create: {
          tenantId: tenant.id,
          role: Role.Manager,
        },
      },
    },
  });

  console.log('✅ Created Users: Owner & Manager');

  // 3. Create Chart of Accounts (Manufacturing-specific)
  const accounts = await prisma.account.createMany({
    data: [
      // Assets
      { tenantId: tenant.id, name: 'Cash in Hand', code: '1001', type: AccountType.Asset },
      { tenantId: tenant.id, name: 'Bank - HDFC Current', code: '1002', type: AccountType.Asset },
      { tenantId: tenant.id, name: 'Raw Material Inventory', code: '1101', type: AccountType.Asset },
      { tenantId: tenant.id, name: 'Finished Goods Inventory', code: '1102', type: AccountType.Asset },
      { tenantId: tenant.id, name: 'Work in Progress', code: '1103', type: AccountType.Asset },
      { tenantId: tenant.id, name: 'Machinery & Equipment', code: '1201', type: AccountType.Asset },
      { tenantId: tenant.id, name: 'Factory Building', code: '1202', type: AccountType.Asset },
      
      // Liabilities
      { tenantId: tenant.id, name: 'Accounts Payable', code: '2001', type: AccountType.Liability },
      { tenantId: tenant.id, name: 'GST Payable', code: '2101', type: AccountType.Liability },
      { tenantId: tenant.id, name: 'TDS Payable', code: '2102', type: AccountType.Liability },
      { tenantId: tenant.id, name: 'Loan - Machinery', code: '2201', type: AccountType.Liability },
      
      // Revenue (not Income in schema)
      { tenantId: tenant.id, name: 'Sales - Furniture', code: '4001', type: AccountType.Revenue },
      { tenantId: tenant.id, name: 'Sales - Custom Orders', code: '4002', type: AccountType.Revenue },
      { tenantId: tenant.id, name: 'Other Income', code: '4101', type: AccountType.Revenue },
      
      // Expenses
      { tenantId: tenant.id, name: 'Cost of Goods Sold', code: '5001', type: AccountType.Expense },
      { tenantId: tenant.id, name: 'Raw Material Purchase', code: '5101', type: AccountType.Expense },
      { tenantId: tenant.id, name: 'Direct Labor Cost', code: '5201', type: AccountType.Expense },
      { tenantId: tenant.id, name: 'Factory Overhead', code: '5301', type: AccountType.Expense },
      { tenantId: tenant.id, name: 'Electricity - Factory', code: '5302', type: AccountType.Expense },
      { tenantId: tenant.id, name: 'Maintenance & Repairs', code: '5303', type: AccountType.Expense },
      { tenantId: tenant.id, name: 'Salaries - Admin', code: '6001', type: AccountType.Expense },
      { tenantId: tenant.id, name: 'Rent - Office', code: '6002', type: AccountType.Expense },
      { tenantId: tenant.id, name: 'Marketing & Advertising', code: '6101', type: AccountType.Expense },
    ],
  });

  console.log('✅ Created Chart of Accounts (Manufacturing)');

  // 4. Create Warehouses
  const mainWarehouse = await prisma.warehouse.create({
    data: {
      tenantId: tenant.id,
      name: 'Main Factory Warehouse',
      location: 'Bangalore - Plant 1',
      manager: 'Rajesh Kumar',
    },
  });

  const finishedGoodsWarehouse = await prisma.warehouse.create({
    data: {
      tenantId: tenant.id,
      name: 'Finished Goods Storage',
      location: 'Bangalore - Godown A',
      manager: 'Priya Sharma',
    },
  });

  console.log('✅ Created Warehouses');

  // 5. Create Raw Materials
  const rawMaterials = [
    { name: 'Teak Wood Plank (8ft x 1ft)', sku: 'RM-TEAK-001', price: 2500, category: 'Raw Material', hsnCode: '4407', gstRate: 12 },
    { name: 'Sheesham Wood Sheet (4ft x 8ft)', sku: 'RM-SHEE-001', price: 3200, category: 'Raw Material', hsnCode: '4407', gstRate: 12 },
    { name: 'Plywood Sheet (8mm)', sku: 'RM-PLY-001', price: 850, category: 'Raw Material', hsnCode: '4412', gstRate: 18 },
    { name: 'Varnish (5L)', sku: 'RM-VAR-001', price: 1200, category: 'Raw Material', hsnCode: '3208', gstRate: 18 },
    { name: 'Wood Screws (Box of 100)', sku: 'RM-SCR-001', price: 150, category: 'Raw Material', hsnCode: '7317', gstRate: 18 },
    { name: 'Sliding Rail Kit', sku: 'RM-RAIL-001', price: 450, category: 'Raw Material', hsnCode: '8302', gstRate: 18 },
    { name: 'Brass Hinges (Pair)', sku: 'RM-HING-001', price: 120, category: 'Raw Material', hsnCode: '8302', gstRate: 18 },
    { name: 'Handles - Modern Steel', sku: 'RM-HAND-001', price: 80, category: 'Raw Material', hsnCode: '8302', gstRate: 18 },
  ];

  const createdRawMaterials = [];
  for (const rm of rawMaterials) {
    const product = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name: rm.name,
        sku: rm.sku,
        price: new Decimal(rm.price),
        costPrice: new Decimal(rm.price * 0.85),
        stock: new Decimal(100), // Initial stock
        category: rm.category,
        hsnCode: rm.hsnCode,
        gstRate: new Decimal(rm.gstRate),
        barcode: `BAR${rm.sku}`,
      },
    });
    createdRawMaterials.push(product);

    // Link raw material to Main Factory Warehouse
    try {
      console.log(`Creating StockLocation for ${product.name}...`);
      const stockLoc = await prisma.stockLocation.create({
        data: {
          productId: product.id,
          warehouseId: mainWarehouse.id,
          quantity: new Decimal(100), // All stock in main warehouse
        },
      });
      console.log(`  ✓ Linked ${product.name} to Main Warehouse`);
    } catch (error) {
      console.error(`  ✗ Error linking ${product.name}:`, error);
    }
  }

  console.log('✅ Created Raw Materials (8 items) and linked to Main Factory Warehouse');

  // 6. Create Finished Products
  const finishedProducts = [
    { name: 'Executive Office Desk (Teak)', sku: 'FG-DESK-001', price: 28000, category: 'Office Furniture', hsnCode: '9403' },
    { name: 'Modular Wardrobe (6ft)', sku: 'FG-WARD-001', price: 45000, category: 'Bedroom Furniture', hsnCode: '9403' },
    { name: 'Dining Table Set (6 Seater)', sku: 'FG-DINE-001', price: 35000, category: 'Dining Furniture', hsnCode: '9403' },
    { name: 'Bookshelf (5 Tier)', sku: 'FG-BOOK-001', price: 12000, category: 'Storage', hsnCode: '9403' },
  ];

  const createdFinishedProducts = [];
  for (const fp of finishedProducts) {
    const product = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name: fp.name,
        sku: fp.sku,
        price: new Decimal(fp.price),
        costPrice: new Decimal(fp.price * 0.6), // 40% margin
        stock: new Decimal(5), // Initial finished goods stock
        category: fp.category,
        hsnCode: fp.hsnCode,
        gstRate: new Decimal(18),
        barcode: `BAR${fp.sku}`,
      },
    });
    createdFinishedProducts.push(product);

    // Link finished products to Finished Goods Storage
    try {
      console.log(`Creating StockLocation for ${product.name}...`);
      const stockLoc = await prisma.stockLocation.create({
        data: {
          productId: product.id,
          warehouseId: finishedGoodsWarehouse.id,
          quantity: new Decimal(5), // All finished goods in separate warehouse
        },
      });
      console.log(`  ✓ Linked ${product.name} to Finished Goods Storage`);
    } catch (error) {
      console.error(`  ✗ Error linking ${product.name}:`, error);
    }
  }

  console.log('✅ Created Finished Products (4 items) and linked to Finished Goods Storage');


  // 7. Create Customers (B2B Manufacturing clients)
  const customers = [
    { firstName: 'Urban Living', company: 'Urban Living Pvt Ltd', email: 'purchase@urbanliving.com', phone: '9876543210', gstin: '29AABCU9603R1ZX' },
    { firstName: 'HomeStyle', company: 'HomeStyle Interiors', email: 'orders@homestyle.com', phone: '9876543211', gstin: '29AABCU9603R1ZY' },
    { firstName: 'Corporate', company: 'Corporate Furnishings', email: 'procurement@corpfurn.com', phone: '9876543212', gstin: '29AABCU9603R1ZZ' },
  ];

  for (const cust of customers) {
    await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        firstName: cust.firstName,
        company: cust.company,
        email: cust.email,
        phone: cust.phone,
        gstin: cust.gstin,
        address: 'Bangalore, Karnataka',
      },
    });
  }

  console.log('✅ Created Customers (3 B2B clients)');

  // 8. Create Suppliers
  const suppliers = [
    { name: 'Karnataka Timber Traders', email: 'sales@kttimber.com', phone: '9876540001', gstin: '29AABCU9603R1AA' },
    { name: 'National Hardware Co', email: 'orders@nathardware.com', phone: '9876540002', gstin: '29AABCU9603R1AB' },
    { name: 'Premium Coatings Ltd', email: 'supply@premcoat.com', phone: '9876540003', gstin: '29AABCU9603R1AC' },
  ];

  for (const sup of suppliers) {
    await prisma.supplier.create({
      data: {
        tenantId: tenant.id,
        name: sup.name,
        email: sup.email,
        phone: sup.phone,
        gstin: sup.gstin,
        address: 'Industrial Area, Bangalore',
      },
    });
  }

  console.log('✅ Created Suppliers (3 vendors)');
  
  // 9. Create Bill of Materials (BOM) for Executive Office Desk
  const desk = createdFinishedProducts.find(p => p.sku === 'FG-DESK-001');
  if (desk) {
    const bom = await prisma.billOfMaterial.create({
      data: {
        tenantId: tenant.id,
        name: 'Standard Executive Desk BOM',
        productId: desk.id,
        quantity: 1,
        overheadRate: new Decimal(15), // 15% overhead
        items: {
          create: [
            { productId: createdRawMaterials.find(p => p.sku === 'RM-TEAK-001')!.id, quantity: new Decimal(4), unit: 'Planks' },
            { productId: createdRawMaterials.find(p => p.sku === 'RM-PLY-001')!.id, quantity: new Decimal(1), unit: 'Sheet' },
            { productId: createdRawMaterials.find(p => p.sku === 'RM-VAR-001')!.id, quantity: new Decimal(0.5), unit: 'Liters' },
            { productId: createdRawMaterials.find(p => p.sku === 'RM-SCR-001')!.id, quantity: new Decimal(50), unit: 'Pieces' },
            { productId: createdRawMaterials.find(p => p.sku === 'RM-RAIL-001')!.id, quantity: new Decimal(2), unit: 'Kits' },
            { productId: createdRawMaterials.find(p => p.sku === 'RM-HAND-001')!.id, quantity: new Decimal(4), unit: 'Pieces' },
          ]
        }
      }
    });
    console.log('✅ Created BOM for Executive Office Desk');

    // 10. Create initial Work Order
    await prisma.workOrder.create({
      data: {
        tenantId: tenant.id,
        orderNumber: 'WO-0001',
        bomId: bom.id,
        quantity: 5,
        status: 'Planned',
        priority: 'High',
        startDate: new Date(),
      }
    });
    console.log('✅ Created Initial Work Order');
  }

  console.log('\n🎉 Manufacturing Seed Data Complete!');
  console.log('📊 Summary:');
  console.log('   - Tenant: Premium Woodcraft Industries (Furniture Manufacturer)');
  console.log('   - Users: 2 (Owner, Manager)');
  console.log('   - Accounts: 23 (Manufacturing Chart of Accounts)');
  console.log('   - Warehouses: 2');
  console.log('   - Raw Materials: 8');
  console.log('   - Finished Products: 4');
  console.log('   - Customers: 3 (B2B)');
  console.log('   - Suppliers: 3');
}

main()
  .catch((e) => {
    console.error('❌ Seeding Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
