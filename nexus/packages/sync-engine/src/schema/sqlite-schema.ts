export const SYNC_TABLES_SQL = `
-- Sync metadata per table
CREATE TABLE IF NOT EXISTS _sync_meta (
  table_name TEXT PRIMARY KEY,
  last_pull_at TEXT,
  last_push_at TEXT
);

-- Sync queue: tracks pending local changes
CREATE TABLE IF NOT EXISTS _sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('INSERT','UPDATE','DELETE')),
  data TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','syncing','failed','synced'))
);

-- Conflict log
CREATE TABLE IF NOT EXISTS _conflicts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  local_data TEXT NOT NULL,
  server_data TEXT NOT NULL,
  resolved_data TEXT,
  resolution TEXT CHECK(resolution IN ('local_wins','server_wins','manual')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

-- Analytics events
CREATE TABLE IF NOT EXISTS _analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  event_name TEXT NOT NULL,
  metadata TEXT,
  session_id TEXT,
  platform TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export const BUSINESS_TABLES_SQL = `
-- Products
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  description TEXT,
  price REAL DEFAULT 0,
  cost_price REAL DEFAULT 0,
  stock REAL DEFAULT 0,
  category TEXT,
  tags TEXT,
  brand TEXT,
  manufacturer TEXT,
  min_stock_level REAL DEFAULT 0,
  supplier_name TEXT,
  is_service INTEGER DEFAULT 0,
  hsn_code TEXT,
  gst_rate REAL DEFAULT 0,
  product_type TEXT DEFAULT 'FinishedGood',
  base_unit TEXT DEFAULT 'pcs',
  barcode TEXT,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  _sync_version INTEGER DEFAULT 1,
  _dirty INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0,
  _last_modified TEXT,
  _conflict TEXT
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  state TEXT,
  gstin TEXT,
  category TEXT,
  pan TEXT,
  vendor_type TEXT DEFAULT 'Individual',
  default_tds_section TEXT,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  _sync_version INTEGER DEFAULT 1,
  _dirty INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0,
  _last_modified TEXT,
  _conflict TEXT
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  gstin TEXT,
  status TEXT DEFAULT 'Lead',
  category TEXT,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  _sync_version INTEGER DEFAULT 1,
  _dirty INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0,
  _last_modified TEXT,
  _conflict TEXT
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  order_number TEXT NOT NULL,
  order_date TEXT,
  expected_date TEXT,
  total_amount REAL DEFAULT 0,
  total_taxable REAL DEFAULT 0,
  total_gst REAL DEFAULT 0,
  total_cgst REAL DEFAULT 0,
  total_sgst REAL DEFAULT 0,
  total_igst REAL DEFAULT 0,
  status TEXT DEFAULT 'Draft',
  notes TEXT,
  created_at TEXT,
  updated_at TEXT,
  _sync_version INTEGER DEFAULT 1,
  _dirty INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0,
  _last_modified TEXT,
  _conflict TEXT
);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  purchase_order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  taxable_amount REAL DEFAULT 0,
  gst_rate REAL DEFAULT 0,
  cgst_amount REAL DEFAULT 0,
  sgst_amount REAL DEFAULT 0,
  igst_amount REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,
  hsn_code TEXT,
  _sync_version INTEGER DEFAULT 1,
  _dirty INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0,
  _last_modified TEXT,
  _conflict TEXT,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)
);

-- Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  warehouse_id TEXT,
  quantity REAL NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('IN','OUT','TRANSFER','ADJUST')),
  reference TEXT,
  notes TEXT,
  created_at TEXT,
  _sync_version INTEGER DEFAULT 1,
  _dirty INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0,
  _last_modified TEXT,
  _conflict TEXT
);

-- Stock Locations
CREATE TABLE IF NOT EXISTS stock_locations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  quantity REAL DEFAULT 0,
  notes TEXT,
  _sync_version INTEGER DEFAULT 1,
  _dirty INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0,
  _last_modified TEXT,
  _conflict TEXT
);

-- Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  is_default INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  _sync_version INTEGER DEFAULT 1,
  _dirty INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0,
  _last_modified TEXT,
  _conflict TEXT
);

-- Invoices (sales)
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  customer_id TEXT,
  invoice_number TEXT NOT NULL,
  invoice_date TEXT,
  due_date TEXT,
  total_amount REAL DEFAULT 0,
  total_taxable REAL DEFAULT 0,
  total_gst REAL DEFAULT 0,
  total_cgst REAL DEFAULT 0,
  total_sgst REAL DEFAULT 0,
  total_igst REAL DEFAULT 0,
  status TEXT DEFAULT 'Draft',
  notes TEXT,
  created_at TEXT,
  updated_at TEXT,
  _sync_version INTEGER DEFAULT 1,
  _dirty INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0,
  _last_modified TEXT,
  _conflict TEXT
);

// Machines
CREATE TABLE IF NOT EXISTS machines (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  type TEXT,
  status TEXT DEFAULT 'Idle',
  hourly_rate REAL DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  _sync_version INTEGER DEFAULT 1,
  _dirty INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0,
  _last_modified TEXT,
  _conflict TEXT
);

-- Manufacturing BOM
CREATE TABLE IF NOT EXISTS manufacturing_bom (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  components TEXT, -- JSON string
  overhead_rate REAL DEFAULT 0,
  is_overhead_fixed INTEGER DEFAULT 0,
  quantity REAL DEFAULT 1,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  _sync_version INTEGER DEFAULT 1,
  _dirty INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0,
  _last_modified TEXT,
  _conflict TEXT
);

-- Manufacturing Orders
CREATE TABLE IF NOT EXISTS manufacturing_orders (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  bom_id TEXT NOT NULL,
  quantity REAL NOT NULL,
  produced_quantity REAL DEFAULT 0,
  scrap_quantity REAL DEFAULT 0,
  status TEXT DEFAULT 'Draft',
  start_date TEXT,
  end_date TEXT,
  machine_id TEXT,
  machine_time_hours REAL DEFAULT 0,
  operator_name TEXT,
  warehouse_id TEXT,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  _sync_version INTEGER DEFAULT 1,
  _dirty INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0,
  _last_modified TEXT,
  _conflict TEXT
);

-- CRM Opportunities
CREATE TABLE IF NOT EXISTS crm_opportunities (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  customer_id TEXT,
  title TEXT NOT NULL,
  value REAL DEFAULT 0,
  stage TEXT DEFAULT 'Discovery',
  probability REAL DEFAULT 0,
  expected_close_date TEXT,
  created_at TEXT,
  updated_at TEXT,
  _sync_version INTEGER DEFAULT 1,
  _dirty INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0,
  _last_modified TEXT,
  _conflict TEXT
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  department_id TEXT,
  designation TEXT,
  joining_date TEXT,
  salary REAL DEFAULT 0,
  status TEXT DEFAULT 'Active',
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  _sync_version INTEGER DEFAULT 1,
  _dirty INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0,
  _last_modified TEXT,
  _conflict TEXT
);

-- Leaves
CREATE TABLE IF NOT EXISTS leaves (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  leave_type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT DEFAULT 'Pending',
  _sync_version INTEGER DEFAULT 1,
  _dirty INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0,
  _last_modified TEXT,
  _conflict TEXT
);

-- Healthcare Patients
CREATE TABLE IF NOT EXISTS healthcare_patients (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  gender TEXT,
  phone TEXT,
  created_at TEXT,
  updated_at TEXT,
  _sync_version INTEGER DEFAULT 1,
  _dirty INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0,
  _last_modified TEXT,
  _conflict TEXT
);

-- Logistics Shipments
CREATE TABLE IF NOT EXISTS logistics_shipments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  consignment_number TEXT NOT NULL,
  origin TEXT,
  destination TEXT,
  status TEXT DEFAULT 'Scheduled',
  estimated_delivery TEXT,
  created_at TEXT,
  updated_at TEXT,
  _sync_version INTEGER DEFAULT 1,
  _dirty INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0,
  _last_modified TEXT,
  _conflict TEXT
);

-- Loans
CREATE TABLE IF NOT EXISTS loans (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  loan_amount REAL DEFAULT 0,
  interest_rate REAL DEFAULT 0,
  tenure_months INTEGER DEFAULT 12,
  status TEXT DEFAULT 'Draft',
  _sync_version INTEGER DEFAULT 1,
  _dirty INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0,
  _last_modified TEXT,
  _conflict TEXT
);
`;

export const ALL_SQL = SYNC_TABLES_SQL + BUSINESS_TABLES_SQL;
