import type Database from 'better-sqlite3';
import { type LocalDataState } from './local-data-store';
import { getDb } from '../db/database';

export class JsonSqliteBridge {
  static async syncSqliteToJson(jsonState: LocalDataState): Promise<LocalDataState> {
    const db = getDb();
    
    // Read from SQLite
    try {
      const products = db.prepare('SELECT * FROM products WHERE _deleted = 0').all() as any[];
      const customers = db.prepare('SELECT * FROM customers WHERE _deleted = 0').all() as any[];
      const invoices = db.prepare('SELECT * FROM invoices WHERE _deleted = 0').all() as any[];
      const employees = db.prepare('SELECT * FROM employees WHERE _deleted = 0').all() as any[];
      const leaves = db.prepare('SELECT * FROM leaves WHERE _deleted = 0').all() as any[];
      const opportunities = db.prepare('SELECT * FROM crm_opportunities WHERE _deleted = 0').all() as any[];
      const patients = db.prepare('SELECT * FROM healthcare_patients WHERE _deleted = 0').all() as any[];
      const shipments = db.prepare('SELECT * FROM logistics_shipments WHERE _deleted = 0').all() as any[];
      const loans = db.prepare('SELECT * FROM loans WHERE _deleted = 0').all() as any[];
      const machines = db.prepare('SELECT * FROM machines WHERE _deleted = 0').all() as any[];
      const boms = db.prepare('SELECT * FROM manufacturing_bom WHERE _deleted = 0').all() as any[];
      const orders = db.prepare('SELECT * FROM manufacturing_orders WHERE _deleted = 0').all() as any[];
      const stockMovements = db.prepare('SELECT * FROM stock_movements WHERE _deleted = 0').all() as any[];
      const stockLocations = db.prepare('SELECT * FROM stock_locations WHERE _deleted = 0').all() as any[];
      const warehouses = db.prepare('SELECT * FROM warehouses WHERE _deleted = 0').all() as any[];

      // Map snake_case to camelCase
      jsonState.products = products.map((row) => ({
        id: row.id,
        name: row.name,
        sku: row.sku,
        stock: row.stock,
        price: row.price,
        costPrice: row.cost_price,
        category: row.category,
        tags: row.tags,
        brand: row.brand,
        manufacturer: row.manufacturer,
        minStockLevel: row.min_stock_level,
        hsnCode: row.hsn_code,
        gstRate: row.gst_rate,
        description: row.description,
        barcode: row.barcode,
        isService: Boolean(row.is_service),
        updatedAt: row.updated_at || row.created_at,
      }));

      jsonState.customers = customers.map((row) => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        company: row.company,
        address: row.address,
        state: row.state,
        gstin: row.gstin,
        status: row.status,
        createdAt: row.created_at,
        receivable: 0, // recalculated dynamically
      }));

      // Mapping Warehouses
      jsonState.warehouses = warehouses.map((row) => ({
        id: row.id,
        name: row.name,
        location: row.address || row.city || 'Local',
        isPrimary: Boolean(row.is_default),
      }));

      jsonState.opportunities = opportunities.map((row) => ({
        id: row.id,
        title: row.title,
        value: row.value,
        stage: row.stage,
        customerId: row.customer_id,
        probability: row.probability,
        expected_close_date: row.expected_close_date,
      }));

      jsonState.employees = employees.map((row) => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        departmentId: row.department_id,
        designation: row.designation,
        joiningDate: row.joining_date,
        salary: row.salary,
        status: row.status,
      }));

      jsonState.leaves = leaves.map((row) => ({
        id: row.id,
        employeeId: row.employee_id,
        leaveType: row.leave_type,
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status,
      }));

      jsonState.patients = patients.map((row) => ({
        id: row.id,
        name: `${row.first_name} ${row.last_name}`.trim(),
        age: 0, // Age not in schema, placeholder
        gender: row.gender,
        contact: row.phone,
        lastVisit: row.updated_at || row.created_at,
        status: 'Stable',
      }));

      jsonState.shipments = shipments.map((row) => ({
        id: row.id,
        consignment: row.consignment_number,
        origin: row.origin,
        destination: row.destination,
        status: row.status,
        estimatedDelivery: row.estimated_delivery,
      }));

      jsonState.loans = loans.map((row) => ({
        id: row.id,
        customerId: row.customer_id,
        amount: row.loan_amount,
        rate: row.interest_rate,
        tenure: row.tenure_months,
        status: row.status,
      }));

      jsonState.machines = machines.map((row) => ({
        id: row.id,
        name: row.name,
        code: row.code,
        type: row.type,
        status: row.status,
        hourlyRate: row.hourly_rate,
      }));

      jsonState.boms = boms.map((row) => ({
        id: row.id,
        productId: row.product_id,
        name: row.name,
        components: JSON.parse(row.components || '[]'),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        overheadRate: row.overhead_rate,
        isOverheadFixed: Boolean(row.is_overhead_fixed),
        quantity: row.quantity,
      }));

      jsonState.manufacturingOrders = orders.map((row) => ({
        id: row.id,
        bomId: row.bom_id,
        orderNumber: row.id.slice(-6),
        quantity: row.quantity,
        status: row.status,
        startDate: row.start_date,
        endDate: row.end_date,
        producedQuantity: row.produced_quantity,
        scrapQuantity: row.scrap_quantity,
        machineId: row.machine_id,
        machineTimeHours: row.machine_time_hours,
        operatorName: row.operator_name,
        warehouseId: row.warehouse_id,
        createdAt: row.created_at,
      }));

      jsonState.stockMovements = stockMovements.map((row) => ({
        id: row.id,
        productId: row.product_id,
        quantity: row.quantity,
        type: row.type,
        warehouseId: row.warehouse_id,
        createdAt: row.created_at,
      }));

      jsonState.stockLocations = stockLocations.map((row) => ({
        id: row.id,
        productId: row.product_id,
        warehouseId: row.warehouse_id,
        quantity: row.quantity,
        notes: row.notes,
      }));

      // In a full implementation, invoices would join invoice_items
      jsonState.invoices = invoices.map((row) => ({
        id: row.id,
        invoiceNumber: row.invoice_number,
        customerId: row.customer_id,
        issueDate: row.invoice_date,
        dueDate: row.due_date,
        totalAmount: row.total_amount,
        amountPaid: 0,
        status: row.status,
        createdAt: row.created_at,
        customer: { firstName: 'Sync', lastName: 'Record' },
        items: [],
        totalTaxable: row.total_taxable,
        totalGst: row.total_gst,
      }));

      return jsonState;
    } catch (error) {
      console.error('Failed to sync SQLite to JSON', error);
      return jsonState;
    }
  }

  static async syncJsonToSqlite(oldState: any, newState: any): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();
    const tenantId = newState.workspace.id;

    // Prepared statements for all entities
    const statements = {
      product: db.prepare(`
        INSERT INTO products (id, tenant_id, name, sku, description, price, cost_price, stock, category, tags, brand, manufacturer, min_stock_level, is_service, hsn_code, gst_rate, barcode, is_deleted, created_at, updated_at, _sync_version, _dirty, _last_modified)
        VALUES (@id, @tenant_id, @name, @sku, @description, @price, @cost_price, @stock, @category, @tags, @brand, @manufacturer, @min_stock_level, @is_service, @hsn_code, @gst_rate, @barcode, 0, @created_at, @updated_at, 1, 1, @now)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name, sku=excluded.sku, description=excluded.description, price=excluded.price, cost_price=excluded.cost_price, stock=excluded.stock, category=excluded.category, tags=excluded.tags, brand=excluded.brand, manufacturer=excluded.manufacturer, min_stock_level=excluded.min_stock_level, is_service=excluded.is_service, hsn_code=excluded.hsn_code, gst_rate=excluded.gst_rate, barcode=excluded.barcode, updated_at=excluded.updated_at, _dirty=1, _last_modified=excluded._last_modified
      `),
      customer: db.prepare(`
        INSERT INTO customers (id, tenant_id, first_name, last_name, email, phone, company, address, state, gstin, status, created_at, updated_at, _sync_version, _dirty, _last_modified)
        VALUES (@id, @tenant_id, @first_name, @last_name, @email, @phone, @company, @address, @state, @gstin, @status, @created_at, @updated_at, 1, 1, @now)
        ON CONFLICT(id) DO UPDATE SET first_name=excluded.first_name, last_name=excluded.last_name, email=excluded.email, phone=excluded.phone, company=excluded.company, address=excluded.address, state=excluded.state, gstin=excluded.gstin, status=excluded.status, updated_at=excluded.updated_at, _dirty=1, _last_modified=excluded._last_modified
      `),
      warehouse: db.prepare(`
        INSERT INTO warehouses (id, tenant_id, name, address, city, state, is_default, created_at, updated_at, _sync_version, _dirty, _last_modified)
        VALUES (@id, @tenant_id, @name, @address, @city, @state, @is_default, @created_at, @updated_at, 1, 1, @now)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name, address=excluded.address, city=excluded.city, state=excluded.state, is_default=excluded.is_default, updated_at=excluded.updated_at, _dirty=1, _last_modified=excluded._last_modified
      `),
      stockLocation: db.prepare(`
        INSERT INTO stock_locations (id, tenant_id, product_id, warehouse_id, quantity, notes, _sync_version, _dirty, _last_modified)
        VALUES (@id, @tenant_id, @product_id, @warehouse_id, @quantity, @notes, 1, 1, @now)
        ON CONFLICT(id) DO UPDATE SET quantity=excluded.quantity, notes=excluded.notes, _dirty=1, _last_modified=excluded._last_modified
      `),
      invoice: db.prepare(`
        INSERT INTO invoices (id, tenant_id, customer_id, invoice_number, invoice_date, due_date, total_amount, total_taxable, total_gst, status, created_at, updated_at, _sync_version, _dirty, _last_modified)
        VALUES (@id, @tenant_id, @customer_id, @invoice_number, @invoice_date, @due_date, @total_amount, @total_taxable, @total_gst, @status, @created_at, @updated_at, 1, 1, @now)
        ON CONFLICT(id) DO UPDATE SET customer_id=excluded.customer_id, invoice_number=excluded.invoice_number, invoice_date=excluded.invoice_date, due_date=excluded.due_date, total_amount=excluded.total_amount, status=excluded.status, updated_at=excluded.updated_at, _dirty=1, _last_modified=excluded._last_modified
      `),
      opportunity: db.prepare(`
        INSERT INTO crm_opportunities (id, tenant_id, customer_id, title, value, stage, probability, expected_close_date, created_at, updated_at, _sync_version, _dirty, _last_modified, is_deleted)
        VALUES (@id, @tenant_id, @customer_id, @title, @value, @stage, @probability, @expected_close_date, @created_at, @updated_at, 1, 1, @now, 0)
        ON CONFLICT(id) DO UPDATE SET title=excluded.title, value=excluded.value, stage=excluded.stage, probability=excluded.probability, expected_close_date=excluded.expected_close_date, updated_at=excluded.updated_at, _dirty=1, _last_modified=excluded._last_modified
      `),
      employee: db.prepare(`
        INSERT INTO employees (id, tenant_id, first_name, last_name, department_id, designation, joining_date, salary, status, created_at, updated_at, _sync_version, _dirty, _last_modified, is_deleted)
        VALUES (@id, @tenant_id, @first_name, @last_name, @department_id, @designation, @joining_date, @salary, @status, @created_at, @updated_at, 1, 1, @now, 0)
        ON CONFLICT(id) DO UPDATE SET first_name=excluded.first_name, last_name=excluded.last_name, department_id=excluded.department_id, designation=excluded.designation, salary=excluded.salary, status=excluded.status, updated_at=excluded.updated_at, _dirty=1, _last_modified=excluded._last_modified
      `),
      leave: db.prepare(`
        INSERT INTO leaves (id, tenant_id, employee_id, leave_type, start_date, end_date, status, created_at, updated_at, _sync_version, _dirty, _last_modified)
        VALUES (@id, @tenant_id, @employee_id, @leave_type, @start_date, @end_date, @status, @created_at, @updated_at, 1, 1, @now)
        ON CONFLICT(id) DO UPDATE SET status=excluded.status, updated_at=excluded.updated_at, _dirty=1, _last_modified=excluded._last_modified
      `),
      shipment: db.prepare(`
        INSERT INTO logistics_shipments (id, tenant_id, consignment_number, origin, destination, status, estimated_delivery, created_at, updated_at, _sync_version, _dirty, _last_modified, is_deleted)
        VALUES (@id, @tenant_id, @consignment_number, @origin, @destination, @status, @estimated_delivery, @created_at, @updated_at, 1, 1, @now, 0)
        ON CONFLICT(id) DO UPDATE SET origin=excluded.origin, destination=excluded.destination, status=excluded.status, estimated_delivery=excluded.estimated_delivery, updated_at=excluded.updated_at, _dirty=1, _last_modified=excluded._last_modified
      `),
      machine: db.prepare(`
        INSERT INTO machines (id, tenant_id, name, code, type, status, hourly_rate, is_deleted, created_at, updated_at, _sync_version, _dirty, _last_modified)
        VALUES (@id, @tenant_id, @name, @code, @type, @status, @hourly_rate, 0, @created_at, @updated_at, 1, 1, @now)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name, code=excluded.code, type=excluded.type, status=excluded.status, hourly_rate=excluded.hourly_rate, updated_at=excluded.updated_at, _dirty=1, _last_modified=excluded._last_modified
      `),
      bom: db.prepare(`
        INSERT INTO manufacturing_bom (id, tenant_id, product_id, name, components, is_deleted, created_at, updated_at, _sync_version, _dirty, _last_modified)
        VALUES (@id, @tenant_id, @product_id, @name, @components, 0, @created_at, @updated_at, 1, 1, @now)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name, components=excluded.components, updated_at=excluded.updated_at, _dirty=1, _last_modified=excluded._last_modified
      `),
      order: db.prepare(`
        INSERT INTO manufacturing_orders (id, tenant_id, bom_id, quantity, produced_quantity, scrap_quantity, status, start_date, end_date, machine_id, machine_time_hours, operator_name, warehouse_id, is_deleted, created_at, updated_at, _sync_version, _dirty, _last_modified)
        VALUES (@id, @tenant_id, @bom_id, @quantity, @produced_quantity, @scrap_quantity, @status, @start_date, @end_date, @machine_id, @machine_time_hours, @operator_name, @warehouse_id, 0, @created_at, @updated_at, 1, 1, @now)
        ON CONFLICT(id) DO UPDATE SET status=excluded.status, start_date=excluded.start_date, end_date=excluded.end_date, produced_quantity=excluded.produced_quantity, scrap_quantity=excluded.scrap_quantity, machine_id=excluded.machine_id, machine_time_hours=excluded.machine_time_hours, operator_name=excluded.operator_name, warehouse_id=excluded.warehouse_id, updated_at=excluded.updated_at, _dirty=1, _last_modified=excluded._last_modified
      `),
      stockMovement: db.prepare(`
        INSERT INTO stock_movements (id, tenant_id, product_id, quantity, type, warehouse_id, created_at, _sync_version, _dirty, _last_modified)
        VALUES (@id, @tenant_id, @product_id, @quantity, @type, @warehouse_id, @created_at, 1, 1, @now)
        ON CONFLICT(id) DO UPDATE SET quantity=excluded.quantity, type=excluded.type, warehouse_id=excluded.warehouse_id, _dirty=1, _last_modified=excluded._last_modified
      `)
    };

    db.transaction(() => {
      // Helper to check for changes
      const hasChanged = (arrName: string, id: string, newItem: any) => {
        const oldItem = oldState[arrName]?.find((i: any) => i.id === id);
        return !oldItem || JSON.stringify(oldItem) !== JSON.stringify(newItem);
      };

      // Sync Products
      for (const p of newState.products) {
        if (hasChanged('products', p.id, p)) {
          statements.product.run({
            id: p.id, tenant_id: tenantId, name: p.name, sku: p.sku || p.name, description: p.description || '',
            price: Number(p.price || 0), cost_price: Number(p.costPrice || 0), stock: Number(p.stock || 0),
            category: p.category || '', tags: p.tags || '', brand: p.brand || '', manufacturer: p.manufacturer || '',
            min_stock_level: Number(p.minStockLevel || 0), is_service: p.isService ? 1 : 0, hsn_code: p.hsnCode || '',
            gst_rate: Number(p.gstRate || 0), barcode: p.barcode || '', created_at: p.updatedAt || now, updated_at: now, now
          });
        }
      }

      // Sync Customers
      for (const c of newState.customers) {
        if (hasChanged('customers', c.id, c)) {
          statements.customer.run({
            id: c.id, tenant_id: tenantId, first_name: c.firstName || 'Unknown', last_name: c.lastName || '',
            email: c.email || '', phone: c.phone || '', company: c.company || '', address: c.address || '',
            state: c.state || '', gstin: c.gstin || '', status: c.status || 'Lead', created_at: c.createdAt || now, updated_at: now, now
          });
        }
      }

      // Sync Invoices
      for (const i of newState.invoices) {
        if (hasChanged('invoices', i.id, i)) {
          statements.invoice.run({
            id: i.id, tenant_id: tenantId, customer_id: i.customerId || '', invoice_number: i.invoiceNumber || '',
            invoice_date: i.issueDate || now, due_date: i.dueDate || now, total_amount: Number(i.totalAmount || 0),
            status: i.status || 'Draft', created_at: i.createdAt || now, updated_at: now, now
          });
        }
      }

      // Sync Opportunities
      for (const o of newState.opportunities || []) {
        if (hasChanged('opportunities', o.id, o)) {
          statements.opportunity.run({
            id: o.id, tenant_id: tenantId, customer_id: o.customerId, title: o.title, value: Number(o.value || 0),
            stage: o.stage, probability: Number(o.probability || 0), expected_close_date: o.expected_close_date || null,
            created_at: now, updated_at: now, now
          });
        }
      }

      // Sync Employees
      for (const e of newState.employees || []) {
        if (hasChanged('employees', e.id, e)) {
          statements.employee.run({
            id: e.id, tenant_id: tenantId, first_name: e.firstName, last_name: e.lastName || '',
            department_id: e.departmentId || null, designation: e.designation || '',
            joining_date: e.joiningDate || now, salary: Number(e.salary || 0), status: e.status,
            created_at: now, updated_at: now, now
          });
        }
      }

      // Sync Leaves
      for (const l of newState.leaves || []) {
        if (hasChanged('leaves', l.id, l)) {
          statements.leave.run({
            id: l.id, tenant_id: tenantId, employee_id: l.employeeId, leave_type: l.leaveType,
            start_date: l.startDate || now, end_date: l.endDate || now, status: l.status || 'Pending',
            created_at: now, updated_at: now, now
          });
        }
      }

      // Sync Shipments
      for (const s of newState.shipments || []) {
        if (hasChanged('shipments', s.id, s)) {
          statements.shipment.run({
            id: s.id, tenant_id: tenantId, consignment_number: s.consignment, origin: s.origin || '',
            destination: s.destination || '', status: s.status, estimated_delivery: s.estimatedDelivery || null,
            created_at: now, updated_at: now, now
          });
        }
      }

      // Sync Machines
      for (const m of newState.machines || []) {
        if (hasChanged('machines', m.id, m)) {
          statements.machine.run({
            id: m.id, tenant_id: tenantId, name: m.name, code: m.code, type: m.type, status: m.status,
            hourly_rate: Number(m.hourlyRate || 0), created_at: now, updated_at: now, now
          });
        }
      }

      // Sync BOMs
      for (const b of newState.boms || []) {
        if (hasChanged('boms', b.id, b)) {
          statements.bom.run({
            id: b.id, tenant_id: tenantId, product_id: b.productId, name: b.name,
            components: JSON.stringify(b.components || []), created_at: now, updated_at: now, now
          });
        }
      }

      // Sync Warehouses
      for (const w of newState.warehouses || []) {
        if (hasChanged('warehouses', w.id, w)) {
          statements.warehouse.run({
            id: w.id, tenant_id: tenantId, name: w.name, address: w.location || '',
            city: '', state: '', is_default: w.isPrimary ? 1 : 0,
            created_at: now, updated_at: now, now
          });
        }
      }

      // Sync Stock Locations
      for (const sl of newState.stockLocations || []) {
        if (hasChanged('stockLocations', sl.id, sl)) {
          statements.stockLocation.run({
            id: sl.id, tenant_id: tenantId, product_id: sl.productId, warehouse_id: sl.warehouseId,
            quantity: Number(sl.quantity || 0), notes: sl.notes || '', now
          });
        }
      }

      // Sync Stock Movements
      for (const sm of newState.stockMovements || []) {
        if (hasChanged('stockMovements', sm.id, sm)) {
          statements.stockMovement.run({
            id: sm.id, tenant_id: tenantId, product_id: sm.productId, quantity: Number(sm.quantity || 0),
            type: sm.type, warehouse_id: sm.warehouseId, created_at: sm.createdAt || now, now
          });
        }
      }

    })();
  }

}
