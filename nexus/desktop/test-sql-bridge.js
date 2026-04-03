const Database = require('better-sqlite3');
const { ALL_SQL } = require('./vendor/sync-engine/dist/schema/sqlite-schema');

async function testBridge() {
  const db = new Database(':memory:');
  db.exec(ALL_SQL);
  console.log('Schema initialized in memory.');

  const sqls = {
    product: `INSERT INTO products (id, tenant_id, name, sku, description, price, cost_price, stock, category, tags, brand, manufacturer, min_stock_level, is_service, hsn_code, gst_rate, barcode, is_deleted, created_at, updated_at, _sync_version, _dirty, _last_modified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    customer: `INSERT INTO customers (id, tenant_id, first_name, last_name, email, phone, company, address, state, gstin, status, created_at, updated_at, _sync_version, _dirty, _last_modified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    warehouse: `INSERT INTO warehouses (id, tenant_id, name, address, city, state, is_default, created_at, updated_at, _sync_version, _dirty, _last_modified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    stockLocation: `INSERT INTO stock_locations (id, tenant_id, product_id, warehouse_id, quantity, notes, _sync_version, _dirty, _last_modified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    invoice: `INSERT INTO invoices (id, tenant_id, customer_id, invoice_number, invoice_date, due_date, total_amount, total_taxable, total_gst, status, created_at, updated_at, _sync_version, _dirty, _last_modified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    opportunity: `INSERT INTO crm_opportunities (id, tenant_id, customer_id, title, value, stage, probability, expected_close_date, created_at, updated_at, _sync_version, _dirty, _last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    employee: `INSERT INTO employees (id, tenant_id, first_name, last_name, department_id, designation, joining_date, salary, status, created_at, updated_at, _sync_version, _dirty, _last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    shipment: `INSERT INTO logistics_shipments (id, tenant_id, consignment_number, origin, destination, status, estimated_delivery, created_at, updated_at, _sync_version, _dirty, _last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    machine: `INSERT INTO machines (id, tenant_id, name, code, type, status, hourly_rate, is_deleted, created_at, updated_at, _sync_version, _dirty, _last_modified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    bom: `INSERT INTO manufacturing_bom (id, tenant_id, product_id, name, components, is_deleted, created_at, updated_at, _sync_version, _dirty, _last_modified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    order: `INSERT INTO manufacturing_orders (id, tenant_id, bom_id, quantity, produced_quantity, scrap_quantity, status, start_date, end_date, machine_id, machine_time_hours, operator_name, warehouse_id, is_deleted, created_at, updated_at, _sync_version, _dirty, _last_modified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    stockMovement: `INSERT INTO stock_movements (id, tenant_id, product_id, quantity, type, warehouse_id, created_at, _sync_version, _dirty, _last_modified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  };

  for (const [key, sql] of Object.entries(sqls)) {
    try {
      db.prepare(sql);
      console.log(`✅ ${key}: OK`);
    } catch (e) {
      console.error(`❌ ${key}: ${e.message}`);
    }
  }
}

testBridge();
