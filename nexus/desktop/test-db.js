const path = require('path');
const app = { getPath: () => __dirname };

const Database = require('better-sqlite3');
const fs = require('fs');

async function test() {
  try {
    const dbPath = path.join(__dirname, 'nexus-offline-test.db');
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

    const db = new Database(dbPath);
    console.log("DB opened.");

    const { ALL_SQL } = require('@nexus/sync-engine');
    if (!ALL_SQL) throw new Error("ALL_SQL not found");
    
    try {
      db.exec(ALL_SQL);
      console.log("Schema applied.");
    } catch(err) {
      console.error("Schema apply error:", err);
    }

    // Try preparing all statements from json-sqlite-bridge.ts
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

    console.log("All statements prepared successfully.");
  } catch (err) {
    console.error("Caught Error:", err.message);
  }
}
test();
