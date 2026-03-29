export const LOCAL_SCHEMA = `
-- Products
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  price REAL DEFAULT 0,
  cost_price REAL DEFAULT 0,
  stock REAL DEFAULT 0,
  category TEXT,
  hsn_code TEXT,
  gst_rate REAL DEFAULT 0,
  product_type TEXT DEFAULT 'FinishedGood',
  base_unit TEXT DEFAULT 'pcs',
  min_stock_level REAL DEFAULT 0,
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
  state TEXT,
  gstin TEXT,
  status TEXT DEFAULT 'Customer',
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
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
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
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
  notes TEXT DEFAULT '',
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
  status TEXT DEFAULT 'Draft',
  total_amount REAL DEFAULT 0,
  order_date TEXT,
  expected_date TEXT,
  created_at TEXT,
  updated_at TEXT,
  _sync_version INTEGER DEFAULT 1,
  _dirty INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0,
  _last_modified TEXT,
  _conflict TEXT
);

-- Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity REAL NOT NULL,
  reference TEXT,
  notes TEXT,
  created_at TEXT,
  _sync_version INTEGER DEFAULT 1,
  _dirty INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0,
  _last_modified TEXT,
  _conflict TEXT
);

-- Sync metadata
CREATE TABLE IF NOT EXISTS _sync_meta (
  table_name TEXT PRIMARY KEY,
  last_pull_at TEXT,
  last_push_at TEXT,
  record_count INTEGER DEFAULT 0
);

-- Sync queue
CREATE TABLE IF NOT EXISTS _sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  data TEXT,
  created_at TEXT NOT NULL,
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  status TEXT DEFAULT 'pending'
);

-- Conflict log
CREATE TABLE IF NOT EXISTS _conflicts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  local_data TEXT NOT NULL,
  server_data TEXT NOT NULL,
  resolved_data TEXT,
  resolution TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);
`;

export const LOCAL_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_dirty ON products(_dirty);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_dirty ON suppliers(_dirty);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_dirty ON customers(_dirty);
CREATE INDEX IF NOT EXISTS idx_stock_locations_tenant ON stock_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_locations_product ON stock_locations(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant ON purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON _sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_table ON _sync_queue(table_name);
`;
