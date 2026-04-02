import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

type HttpMethod = "get" | "post" | "patch" | "put" | "delete";

interface DesktopOfflineSession {
  mode: "offline";
  userId: string;
  fullName: string;
  email: string;
  role: string;
  tenantId: string;
  tenantName: string;
  industry: string;
  createdAt: string;
  lastOpenedAt: string;
}

interface DesktopUserProfile {
  id: string;
  fullName: string;
  email: string;
  role: string;
  tenantId: string;
  tenantName: string;
  industry: string;
  isSuperAdmin: boolean;
}

interface LocalWorkspace {
  id: string;
  name: string;
  industry: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

interface LocalUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface LocalWarehouse {
  id: string;
  name: string;
  location: string;
  isPrimary: boolean;
}

interface LocalProduct {
  id: string;
  name: string;
  sku: string;
  stock: number;
  price: number;
  costPrice: number;
  category: string;
  tags: string;
  brand: string;
  manufacturer: string;
  minStockLevel: number;
  hsnCode: string;
  gstRate: number;
  description: string;
  barcode: string;
  isService: boolean;
  updatedAt: string;
  updatedBy?: {
    fullName: string;
  };
}

interface LocalCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  state: string;
  gstin: string;
  status: string;
  receivable: number;
  createdAt: string;
}

interface LocalEmployee {
  id: string;
  firstName: string;
  lastName: string;
  departmentId: string;
  designation: string;
  joiningDate: string;
  salary: number;
  status: "Active" | "Terminated" | "On Leave";
}

interface LocalLeave {
  id: string;
  employeeId: string;
  leaveType: string;
  startDate: string;
  end_date: string;
  status: "Pending" | "Approved" | "Rejected";
}

interface LocalPatient {
  id: string;
  name: string;
  age: number;
  gender: string;
  contact: string;
  lastVisit: string;
  status: string;
}

interface LocalShipment {
  id: string;
  consignment: string;
  origin: string;
  destination: string;
  status: string;
  estimatedDelivery: string;
}

interface LocalLoan {
  id: string;
  customerId: string;
  amount: number;
  rate: number;
  tenure: number;
  status: string;
}

interface LocalBOMComponent {
  id: string;
  productId: string;
  quantity: number;
  productName?: string;
}

interface LocalBOM {
  id: string;
  productId: string;
  name: string;
  components: LocalBOMComponent[];
  createdAt: string;
  updatedAt: string;
  product?: {
    name: string;
  };
}

interface LocalWorkOrder {
  id: string;
  bomId: string;
  orderNumber: string;
  quantity: number;
  status: "Planned" | "InProgress" | "Completed" | "Cancelled";
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  bom?: LocalBOM;
  machineId?: string;
  operatorName?: string;
  producedQuantity?: number;
  scrapQuantity?: number;
  machineTimeHours?: number;
}

interface LocalMachine {
  id: string;
  name: string;
  code: string;
  type: string;
  status: "Idle" | "Running" | "Maintenance";
  hourlyRate: number;
}

interface LocalOpportunity {
  id: string;
  title: string;
  value: number;
  stage: string;
  customerId: string;
  probability?: number;
  expected_close_date?: string;
  customer?: {
    firstName: string;
    lastName: string;
  };
}

interface LocalAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
  createdAt: string;
}

interface LocalTransaction {
  id: string;
  date: string;
  account?: {
    name: string;
  };
  type?: "Credit" | "Debit";
  amount?: number;
  description: string;
  reference?: string;
  correlationId?: string;
  transactions?: Array<{
    accountId: string;
    type: "Credit" | "Debit";
    amount: number;
  }>;
}

interface LocalInvoiceItem {
  productId: string;
  quantity: number;
  price: number;
  gstRate: number;
  hsnCode: string;
  total: number;
}

interface LocalInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  amountPaid: number;
  status: string;
  paymentMode?: string;
  items: LocalInvoiceItem[];
  createdAt: string;
}

interface LocalActivity {
  id: string;
  message: string;
  user: string;
  time: string;
}

interface LocalSyncOperation {
  id: string;
  method: string;
  endpoint: string;
  payload: unknown;
  createdAt: string;
  status: "pending";
}

interface LocalFixedAsset {
  id: string;
  name: string;
  assetCode: string;
  purchaseDate: string;
  purchaseValue: string;
  salvageValue: string;
  usefulLife: number;
  accumulatedDepreciation: string;
  status: string;
  depreciationLogs: Array<{
    id: string;
    amount: string;
    date: string;
    description: string;
  }>;
}

interface DesktopLocalState {
  version: 1;
  workspace: LocalWorkspace;
  users: LocalUser[];
  warehouses: LocalWarehouse[];
  products: LocalProduct[];
  customers: LocalCustomer[];
  opportunities: LocalOpportunity[];
  accounts: LocalAccount[];
  transactions: LocalTransaction[];
  invoices: LocalInvoice[];
  activities: LocalActivity[];
  syncQueue: LocalSyncOperation[];
  fixedAssets: LocalFixedAsset[];
  // Industry specific
  employees: LocalEmployee[];
  leaves: LocalLeave[];
  patients: LocalPatient[];
  shipments: LocalShipment[];
  loans: LocalLoan[];
  machines: LocalMachine[];
  boms: LocalBOM[];
  manufacturingOrders: LocalWorkOrder[];
  stockMovements: Array<Record<string, any>>;
  stockLocations: Array<Record<string, any>>;
  installedApps: string[];
}

interface SearchResult {
  type: "Product" | "Customer" | "Bill" | "Order";
  title: string;
  subtitle: string;
  path: string;
}

const DEFAULT_ENABLED_MODULES = [
  "dashboard",
  "crm",
  "settings",
  "apps",
  "accounting",
  "inventory",
  "sales",
  "purchases",
  "manufacturing",
];

const MARKETPLACE_APPS = [
  {
    id: "inventory-core",
    name: "inventory-core",
    label: "Inventory Core",
    description: "Offline inventory management for products, stock, and warehouses.",
    version: "1.0.0",
    author: "Klypso",
    category: "Operations",
  },
  {
    id: "accounting-core",
    name: "accounting-core",
    label: "Accounting Core",
    description: "Offline invoicing, ledgers, and receivables for the desktop workspace.",
    version: "1.0.0",
    author: "Klypso",
    category: "Finance",
  },
  {
    id: "crm-core",
    name: "crm-core",
    label: "CRM Core",
    description: "Local customers and pipeline tracking for desktop operators.",
    version: "1.0.0",
    author: "Klypso",
    category: "Sales",
  },
];

function getDesktopBridge() {
  if (typeof window === "undefined") return null;
  return window.nexusDesktop ?? null;
}

export function isDesktopShell(): boolean {
  if (typeof window === "undefined") return false;
  
  // Strict shell detection: Look for the 'nexusDesktop' bridge injected by the Electron preload.
  // This ensures we never misidentify a standard web browser as the desktop shell.
  const hasBridge = Boolean(window.nexusDesktop && typeof window.nexusDesktop === 'object');
  const isDesktopEnv = Boolean(window.nexusDesktop?.shell?.isDesktop);
  
  return hasBridge && isDesktopEnv;
}

export function isDesktopOfflineMode(): boolean {
  if (!isDesktopShell() || typeof window === "undefined") return false;
  return localStorage.getItem("k_desktop_mode") === "offline";
}

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).substring(2, 11)}`;
}

function makeCorrelationId() {
  return `trace_${Math.random().toString(36).substring(2, 15)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function round2(num: number): number {
  return Math.round(num * 100) / 100;
}

function convertUnit(quantity: number, fromUnit: string, toUnit: string): number {
  const f = (fromUnit || "pcs").toLowerCase();
  const t = (toUnit || "pcs").toLowerCase();
  if (f === t) return quantity;
  if (f === "kg" && t === "g") return quantity * 1000;
  if (f === "g" && t === "kg") return quantity / 1000;
  if (f === "l" && t === "ml") return quantity * 1000;
  if (f === "ml" && t === "l") return quantity / 1000;
  return quantity;
}

function getBOMById(state: DesktopLocalState, id: string) {
  return state.boms.find(b => b.id === id);
}

function explodeBOMRecursive(state: DesktopLocalState, bomId: string, multiplier: number, depth = 0): Array<{ productId: string, quantity: number, unit: string }> {
  if (depth > 10) return [];
  const bom = getBOMById(state, bomId) as any;
  if (!bom) return [];

  let result: Array<{ productId: string, quantity: number, unit: string }> = [];
  const components = (bom.components as any[]) || [];

  for (const comp of components) {
    const subBom = state.boms.find(b => (b as any).productId === comp.productId) as any;
    const itemQty = comp.quantity * multiplier;

    if (subBom) {
      result = result.concat(explodeBOMRecursive(state, subBom.id, itemQty / (bom.quantity || 1), depth + 1));
    } else {
      result.push({
        productId: comp.productId,
        quantity: itemQty,
        unit: comp.unit || "pcs"
      });
    }
  }
  return result;
}

function recordProductionMovement(state: DesktopLocalState, {
  productId, warehouseId, quantity, type, reference, notes, correlationId, accountId, contraAccountId
}: any) {
  // 1. Log Movement
  state.stockMovements.push({
    id: makeId("sm"),
    productId,
    warehouseId,
    quantity,
    type,
    reference,
    notes,
    correlationId,
    createdAt: nowIso()
  });

  // 2. Update Location
  let loc = state.stockLocations.find(l => l.productId === productId && l.warehouseId === warehouseId && l.notes === notes);
  if (!loc) {
    loc = { id: makeId("sl"), productId, warehouseId, quantity: 0, notes };
    state.stockLocations.push(loc);
  }
  loc.quantity = type === "IN" ? Number(loc.quantity || 0) + quantity : Number(loc.quantity || 0) - quantity;

  // 3. Update Product Total Stock
  const product = state.products.find(p => p.id === productId) as any;
  if (product) {
    product.stock = type === "IN" ? Number(product.stock || 0) + quantity : Number(product.stock || 0) - quantity;
  }

  // 4. Accounting Ledger (Experimental Parity)
  if (accountId && contraAccountId && product) {
    const value = round2(Number(product.costPrice || 0) * quantity);
    if (value > 0) {
      state.transactions.push({
        id: makeId("txn"),
        date: nowIso(),
        description: notes,
        reference,
        correlationId,
        transactions: [
          { accountId, type: type === "IN" ? "Debit" : "Credit", amount: value },
          { accountId: contraAccountId, type: type === "IN" ? "Credit" : "Debit", amount: value }
        ]
      });
    }
  }
}

function deriveNameFromEmail(email: string): string {
  const localPart = email.split("@")[0] || "Local Owner";
  return localPart
    .replace(/[._-]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function deriveWorkspaceName(email: string, fallback = "Local Workspace"): string {
  const company = email.split("@")[1]?.split(".")[0];
  if (!company) return fallback;
  return company.charAt(0).toUpperCase() + company.slice(1);
}

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function base64UrlEncode(value: string): string {
  const encoded = typeof window !== "undefined"
    ? window.btoa(unescape(encodeURIComponent(value)))
    : Buffer.from(value, "utf8").toString("base64");

  return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function buildOfflineToken(session: DesktopOfflineSession, isOnboarded = true): string {
  const header = { alg: "none", typ: "JWT" };
  const payload = {
    sub: session.userId,
    id: session.userId,
    email: session.email,
    fullName: session.fullName,
    role: session.role,
    tenantId: session.tenantId,
    tenantName: session.tenantName,
    type: "desktop-local",
    industry: session.industry,
    isOnboarded,
    isSuperAdmin: false,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365 * 5),
  };

  return `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}.`;
}

function buildUserProfile(session: DesktopOfflineSession): DesktopUserProfile {
  return {
    id: session.userId,
    fullName: session.fullName,
    email: session.email,
    role: session.role,
    tenantId: session.tenantId,
    tenantName: session.tenantName,
    industry: session.industry,
    isSuperAdmin: false,
  };
}

function persistBrowserSession(session: DesktopOfflineSession, isOnboarded = true) {
  if (typeof window === "undefined") return;

  localStorage.setItem("k_desktop_mode", "offline");
  localStorage.setItem("k_token", buildOfflineToken(session, isOnboarded));
  localStorage.setItem("k_user", JSON.stringify(buildUserProfile(session)));
  localStorage.removeItem("k_identity");
}

function normalizeState(raw: unknown): DesktopLocalState {
  const baseNow = nowIso();
  const input = (raw as Partial<DesktopLocalState>) || {};

  return {
    version: 1,
    workspace: {
      id: input.workspace?.id || "local-workspace",
      name: input.workspace?.name || "Local Workspace",
      industry: input.workspace?.industry || "General",
      currency: input.workspace?.currency || "INR",
      createdAt: input.workspace?.createdAt || baseNow,
      updatedAt: input.workspace?.updatedAt || baseNow,
    },
    users: Array.isArray(input.users) ? input.users as LocalUser[] : [],
    warehouses: Array.isArray(input.warehouses) ? input.warehouses as LocalWarehouse[] : [
      {
        id: "warehouse-main",
        name: "Main Warehouse",
        location: "Local Device",
        isPrimary: true,
      },
    ],
    products: Array.isArray(input.products) ? input.products as LocalProduct[] : [],
    customers: Array.isArray(input.customers) ? input.customers as LocalCustomer[] : [],
    opportunities: Array.isArray(input.opportunities) ? input.opportunities as LocalOpportunity[] : [],
    accounts: Array.isArray(input.accounts) ? input.accounts as LocalAccount[] : [],
    transactions: Array.isArray(input.transactions) ? input.transactions as LocalTransaction[] : [],
    invoices: Array.isArray(input.invoices) ? input.invoices as LocalInvoice[] : [],
    activities: Array.isArray(input.activities) ? input.activities as LocalActivity[] : [],
    syncQueue: Array.isArray(input.syncQueue) ? input.syncQueue as LocalSyncOperation[] : [],
    fixedAssets: Array.isArray(input.fixedAssets) ? input.fixedAssets as LocalFixedAsset[] : [],
    employees: Array.isArray(input.employees) ? input.employees as LocalEmployee[] : [],
    leaves: Array.isArray(input.leaves) ? input.leaves as LocalLeave[] : [],
    patients: Array.isArray(input.patients) ? input.patients as LocalPatient[] : [],
    shipments: Array.isArray(input.shipments) ? input.shipments as LocalShipment[] : [],
    loans: Array.isArray(input.loans) ? input.loans as LocalLoan[] : [],
    machines: Array.isArray(input.machines) ? input.machines as LocalMachine[] : [],
    boms: Array.isArray(input.boms) ? input.boms : [],
    manufacturingOrders: Array.isArray(input.manufacturingOrders) ? input.manufacturingOrders : [],
    stockMovements: Array.isArray(input.stockMovements) ? input.stockMovements : [],
    stockLocations: Array.isArray(input.stockLocations) ? input.stockLocations : [],
    installedApps: Array.isArray(input.installedApps) ? input.installedApps : ["inventory-core", "accounting-core", "crm-core"],
  };
}

async function getLocalState(): Promise<DesktopLocalState> {
  const bridge = getDesktopBridge();
  if (!bridge?.localData?.get) {
    throw new Error("Desktop local data bridge is unavailable.");
  }

  return normalizeState(await bridge.localData.get());
}

async function saveLocalState(state: DesktopLocalState): Promise<DesktopLocalState> {
  const bridge = getDesktopBridge();
  if (!bridge?.localData?.set) {
    throw new Error("Desktop local data bridge is unavailable.");
  }

  const nextState = normalizeState({
    ...state,
    workspace: {
      ...state.workspace,
      updatedAt: nowIso(),
    },
  });

  await bridge.localData.set(nextState);
  return nextState;
}

function currentStoredUser(): DesktopUserProfile | null {
  if (typeof window === "undefined") return null;
  return safeParseJson<DesktopUserProfile>(localStorage.getItem("k_user"));
}

function pushActivity(state: DesktopLocalState, message: string, user = currentStoredUser()?.fullName || "Local Owner") {
  state.activities.unshift({
    id: makeId("activity"),
    message,
    user,
    time: nowIso(),
  });
  state.activities = state.activities.slice(0, 100);
}

function queueForSync(state: DesktopLocalState, method: string, endpoint: string, payload: unknown) {
  state.syncQueue.unshift({
    id: makeId("sync"),
    method,
    endpoint,
    payload,
    createdAt: nowIso(),
    status: "pending",
  });
}

function normalizeApiPath(url = ""): URL {
  const stripped = url
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/?portal\/api\/v1\/?/i, "")
    .replace(/^\/?api\/v1\/?/i, "")
    .replace(/^\/+/, "");

  return new URL(`http://desktop.local/${stripped}`);
}

function parseBody<T>(config: InternalAxiosRequestConfig): T {
  if (!config.data) return {} as T;
  if (typeof config.data === "string") {
    try {
      return JSON.parse(config.data) as T;
    } catch {
      return {} as T;
    }
  }

  return config.data as T;
}

function buildResponse<T>(
  config: InternalAxiosRequestConfig,
  data: T,
  status = 200,
): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: "OK",
    headers: {
      "x-app-version": "desktop-local",
    },
    config,
  };
}

function buildOfflineError(config: InternalAxiosRequestConfig, message: string): never {
  throw {
    config,
    response: {
      status: 503,
      data: {
        message,
      },
    },
    isOfflineLocalUnsupported: true,
  };
}

function paginate<T>(items: T[], page: number, limit: number) {
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 50;
  const start = (safePage - 1) * safeLimit;
  const data = items.slice(start, start + safeLimit);

  return {
    data,
    meta: {
      page: safePage,
      limit: safeLimit,
      total: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / safeLimit)),
    },
  };
}

function buildForecast(state: DesktopLocalState) {
  const pendingInvoices = state.invoices
    .filter((invoice) => invoice.status !== "Cancelled" && invoice.totalAmount > invoice.amountPaid)
    .slice(0, 3)
    .map((invoice, index) => ({
      invoiceNumber: invoice.invoiceNumber,
      customerName: `${invoice.customer.firstName} ${invoice.customer.lastName}`.trim() || "Walk-in Customer",
      amount: round2(invoice.totalAmount - invoice.amountPaid),
      expectedDate: new Date(Date.now() + ((index + 3) * 86400000)).toISOString(),
      probability: 85 - (index * 10),
    }));

  return {
    projections: pendingInvoices,
    totalExpected: round2(pendingInvoices.reduce((sum, invoice) => sum + invoice.amount, 0)),
    avgSettlementDays: pendingInvoices.length > 0 ? 7 : 0,
    trendPercentage: pendingInvoices.length > 0 ? 8 : 0,
  };
}

function buildAccountingStats(state: DesktopLocalState) {
  const activeInvoices = state.invoices.filter((invoice) => invoice.status !== "Cancelled");
  const income = round2(activeInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0));
  const receivable = round2(activeInvoices.reduce((sum, invoice) => sum + Math.max(0, invoice.totalAmount - invoice.amountPaid), 0));
  const expenses = round2(activeInvoices.reduce((sum, invoice) => {
    return sum + invoice.items.reduce((itemSum, item) => {
      const product = state.products.find((entry) => entry.id === item.productId);
      return itemSum + ((product?.costPrice || 0) * item.quantity);
    }, 0);
  }, 0));
  const overdueAmount = round2(activeInvoices.reduce((sum, invoice) => {
    if (new Date(invoice.dueDate).getTime() < Date.now() && invoice.totalAmount > invoice.amountPaid) {
      return sum + (invoice.totalAmount - invoice.amountPaid);
    }
    return sum;
  }, 0));

  const topDebtors = [...state.customers]
    .sort((a, b) => (b.receivable || 0) - (a.receivable || 0))
    .slice(0, 5)
    .map((customer) => ({
      name: customer.company || `${customer.firstName} ${customer.lastName}`.trim(),
      amount: round2(customer.receivable || 0),
      aging: customer.receivable > 0 ? 7 : 0,
    }));

  return {
    receivable,
    netProfit: round2(income - expenses),
    income,
    expenses,
    overdueAmount,
    gstLiability: round2(activeInvoices.reduce((sum, invoice) => {
      return sum + invoice.items.reduce((itemSum, item) => itemSum + ((item.price * item.quantity) * ((item.gstRate || 0) / 100)), 0);
    }, 0)),
    topDebtors,
  };
}

function buildInventoryStats(state: DesktopLocalState) {
  return {
    totalProducts: state.products.length,
    lowStock: state.products.filter((product) => product.stock <= product.minStockLevel).length,
    totalValue: round2(state.products.reduce((sum, product) => sum + (product.stock * product.costPrice), 0)),
  };
}

function buildAnalyticsSummary(state: DesktopLocalState) {
  const accounting = buildAccountingStats(state);

  return {
    revenue: accounting.income,
    expenses: accounting.expenses,
    profit: accounting.netProfit,
    orderCount: state.invoices.filter((invoice) => invoice.status !== "Cancelled").length,
    customerCount: state.customers.length,
    inventoryCount: state.products.length,
    activeCampaigns: 0,
    workOrderCount: 0,
  };
}

function buildPerformanceSeries(state: DesktopLocalState) {
  const monthMap = new Map<string, number>();

  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const label = date.toLocaleString("en-IN", { month: "short" });
    monthMap.set(label, 0);
  }

  for (const invoice of state.invoices) {
    if (invoice.status === "Cancelled") continue;
    const label = new Date(invoice.issueDate).toLocaleString("en-IN", { month: "short" });
    if (!monthMap.has(label)) continue;
    monthMap.set(label, round2((monthMap.get(label) || 0) + invoice.totalAmount));
  }

  return Array.from(monthMap.entries()).map(([month, revenue]) => ({
    month,
    revenue,
  }));
}

function recalculateCustomerReceivables(state: DesktopLocalState) {
  state.customers = state.customers.map((customer) => {
    const receivable = round2(state.invoices.reduce((sum, invoice) => {
      if (invoice.customerId !== customer.id || invoice.status === "Cancelled") return sum;
      return sum + Math.max(0, invoice.totalAmount - invoice.amountPaid);
    }, 0));

    return {
      ...customer,
      receivable,
    };
  });
}

function buildValueChain(state: DesktopLocalState) {
  return [
    { label: "Leads", count: state.customers.filter((customer) => customer.status === "Lead").length, color: "#94A3B8" },
    { label: "Customers", count: state.customers.filter((customer) => customer.status !== "Lead").length, color: "#3B82F6" },
    { label: "Products", count: state.products.length, color: "#10B981" },
    { label: "Invoices", count: state.invoices.filter((invoice) => invoice.status !== "Cancelled").length, color: "#F59E0B" },
  ];
}

function searchResults(state: DesktopLocalState, query: string): SearchResult[] {
  const q = query.toLowerCase();

  const productMatches = state.products
    .filter((product) => [product.name, product.sku, product.barcode].join(" ").toLowerCase().includes(q))
    .slice(0, 3)
    .map<SearchResult>((product) => ({
      type: "Product",
      title: product.name,
      subtitle: `${product.sku} • Stock ${product.stock}`,
      path: "/inventory",
    }));

  const customerMatches = state.customers
    .filter((customer) => [customer.firstName, customer.lastName, customer.company, customer.phone].join(" ").toLowerCase().includes(q))
    .slice(0, 3)
    .map<SearchResult>((customer) => ({
      type: "Customer",
      title: customer.company || `${customer.firstName} ${customer.lastName}`.trim(),
      subtitle: customer.email || customer.phone || "Offline customer",
      path: "/crm",
    }));

  const invoiceMatches = state.invoices
    .filter((invoice) => invoice.invoiceNumber.toLowerCase().includes(q))
    .slice(0, 3)
    .map<SearchResult>((invoice) => ({
      type: "Bill",
      title: invoice.invoiceNumber,
      subtitle: `${invoice.customer.firstName} ${invoice.customer.lastName}`.trim() || "Walk-in Customer",
      path: "/accounting",
    }));

  return [...productMatches, ...customerMatches, ...invoiceMatches];
}

function ensureUserInState(state: DesktopLocalState, session: DesktopOfflineSession) {
  const existingUser = state.users.find((user) => user.id === session.userId);
  if (existingUser) {
    existingUser.fullName = session.fullName;
    existingUser.email = session.email;
    existingUser.role = session.role;
    existingUser.isActive = true;
    return;
  }

  state.users.unshift({
    id: session.userId,
    fullName: session.fullName,
    email: session.email,
    role: session.role,
    isActive: true,
    createdAt: session.createdAt,
  });
}

export async function createDesktopOfflineSession(input?: {
  fullName?: string;
  email?: string;
  tenantName?: string;
}): Promise<DesktopOfflineSession> {
  // Wait for the desktop bridge to be fully available (up to 3 seconds)
  // This solves the 'Offline workspace could not be opened' error by allowing the Electron preload time to finish.
  let bridge = getDesktopBridge();
  let attempts = 0;
  while ((!bridge || !bridge.session) && attempts < 15) {
    await new Promise(r => setTimeout(r, 200));
    bridge = getDesktopBridge();
    attempts++;
  }

  if (!bridge || !bridge.session || !bridge.session.set) {
    throw new Error("Desktop session bridge is unavailable on this device.");
  }

  // Ensure state is loaded and workspace is ready
  const state = await getLocalState();
  if (!state.workspace) {
    state.workspace = {
      id: makeId("ws"),
      name: "Local Workspace",
      industry: "General",
      currency: "INR",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  }
  
  const email = input?.email?.trim() || currentStoredUser()?.email || "owner@local.erp";
  const fullName = input?.fullName?.trim() || deriveNameFromEmail(email) || "Local Owner";
  const createdAt = nowIso();
  const tenantName = input?.tenantName?.trim() || state.workspace.name || deriveWorkspaceName(email);

  state.workspace = {
    ...state.workspace,
    name: tenantName,
    industry: state.workspace.industry || "General",
  };

  const session: DesktopOfflineSession = {
    mode: "offline",
    userId: makeId("local-user"),
    fullName,
    email,
    role: "Owner",
    tenantId: state.workspace.id,
    tenantName,
    industry: state.workspace.industry || "General",
    createdAt,
    lastOpenedAt: createdAt,
  };

  ensureUserInState(state, session);
  pushActivity(state, "Opened desktop workspace in offline mode", fullName);
  await saveLocalState(state);

  const persisted = await bridge.session.set(session) as DesktopOfflineSession;
  persistBrowserSession(persisted);
  return persisted;
}

export async function hydrateDesktopOfflineSession(): Promise<boolean> {
  const bridge = getDesktopBridge();
  if (typeof window === "undefined") return false;

  const state = await getLocalState();
  
  // First-run detection: Is the workspace still using default "Guest" values?
  const isOnboarded = Boolean(
    state.workspace.industry && 
    state.workspace.industry !== "General" && 
    state.workspace.name && 
    state.workspace.name !== "Local Workspace"
  );

  // [FIX-IDENTITY-01] Global Identity Lock: If we already have a real user session (Cloud or Local),
  // do NOT overwrite it with a guest account. This prevents "Local Administrator" from popping up
  // after a successful cloud login.
  const hasUser = Boolean(localStorage.getItem('k_user') || localStorage.getItem('k_token'));
  if (hasUser) {
    console.log('[SHELL] Real Identity detected. Bypassing Guest Fallback.');
    return true;
  }

  // Fallback: Generate a "Guest Admin" session to bypass login
  const guestSession: DesktopOfflineSession = {
    mode: "offline",
    userId: "local-admin-1",
    fullName: "Local Administrator",
    email: "admin@desktop.local",
    role: "Admin",
    tenantId: state.workspace.id,
    tenantName: state.workspace.name,
    industry: state.workspace.industry,
    createdAt: nowIso(),
    lastOpenedAt: nowIso(),
  };

  persistBrowserSession(guestSession, isOnboarded);
  return true;
}

export async function clearDesktopOfflineSession(): Promise<void> {
  const bridge = getDesktopBridge();
  if (bridge?.session?.clear) {
    await bridge.session.clear();
  }

  if (typeof window !== "undefined") {
    localStorage.removeItem("k_desktop_mode");
    localStorage.removeItem("k_token");
    localStorage.removeItem("k_user");
    localStorage.removeItem("k_identity");
  }
}

function applyInvoiceToState(
  state: DesktopLocalState,
  payload: Record<string, unknown>,
): LocalInvoice {
  const issueDate = String(payload.issueDate || nowIso());
  const dueDate = String(payload.dueDate || issueDate);
  const amountPaid = Number(payload.amountPaid || 0);
  const paymentMode = String(payload.paymentMode || "Cash");
  const itemsPayload = Array.isArray(payload.items) ? payload.items as Array<Record<string, unknown>> : [];
  const customerId = String(payload.customerId || "walk-in-customer");

  let customer = state.customers.find((entry) => entry.id === customerId);
  if (!customer) {
    customer = {
      id: customerId,
      firstName: "Walk-in",
      lastName: "Customer",
      email: "",
      phone: "",
      company: "Walk-in Customer",
      address: "",
      state: "",
      gstin: "",
      status: "Customer",
      receivable: 0,
      createdAt: nowIso(),
    };
    state.customers.unshift(customer);
  }

  const items: LocalInvoiceItem[] = itemsPayload.map((rawItem) => {
    const product = state.products.find((entry) => entry.id === String(rawItem.productId || ""));
    const price = Number(rawItem.price ?? product?.price ?? 0);
    const quantity = Number(rawItem.quantity ?? 0);
    const gstRate = Number(rawItem.gstRate ?? product?.gstRate ?? 0);

    return {
      productId: String(rawItem.productId || ""),
      quantity,
      price,
      gstRate,
      hsnCode: String(rawItem.hsnCode ?? product?.hsnCode ?? ""),
      total: round2(price * quantity),
    };
  });

  const subtotal = round2(items.reduce((sum, item) => sum + (item.price * item.quantity), 0));
  const totalTax = round2(items.reduce((sum, item) => sum + ((item.price * item.quantity) * (item.gstRate / 100)), 0));
  const totalAmount = round2(subtotal + totalTax);

  const invoice: LocalInvoice = {
    id: String(payload.id || makeId("invoice")),
    invoiceNumber: String(payload.invoiceNumber || `INV-${Date.now().toString().slice(-8)}`),
    customerId: customer.id,
    customer: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
    },
    issueDate,
    dueDate,
    totalAmount,
    amountPaid,
    status: amountPaid >= totalAmount ? "Paid" : amountPaid > 0 ? "Partially Paid" : "Pending",
    paymentMode,
    items,
    createdAt: nowIso(),
  };

  state.invoices.unshift(invoice);

  for (const item of items) {
    const product = state.products.find((entry) => entry.id === item.productId);
    if (product) {
      product.stock = round2(product.stock - item.quantity);
      product.updatedAt = nowIso();
    }
  }

  state.transactions.unshift(
    {
      id: makeId("txn"),
      date: issueDate,
      account: { name: "Sales" },
      type: "Credit",
      amount: totalAmount,
      description: `Invoice ${invoice.invoiceNumber}`,
    },
    {
      id: makeId("txn"),
      date: issueDate,
      account: { name: amountPaid > 0 ? "Cash in Hand" : "Accounts Receivable" },
      type: "Debit",
      amount: totalAmount,
      description: `Invoice ${invoice.invoiceNumber}`,
    },
  );

  recalculateCustomerReceivables(state);
  pushActivity(state, `Issued invoice ${invoice.invoiceNumber}`);
  queueForSync(state, "POST", "accounting/invoices", payload);
  return invoice;
}

function recordPaymentInState(state: DesktopLocalState, payload: Record<string, unknown>) {
  const invoiceId = String(payload.invoiceId || "");
  const invoice = state.invoices.find((entry) => entry.id === invoiceId);
  if (!invoice) {
    buildOfflineError({} as InternalAxiosRequestConfig, "Invoice not found in local workspace.");
  }

  const amount = Number(payload.amount || 0);
  invoice.amountPaid = round2(invoice.amountPaid + amount);
  invoice.status = invoice.amountPaid >= invoice.totalAmount ? "Paid" : "Partially Paid";

  state.transactions.unshift({
    id: makeId("txn"),
    date: String(payload.date || nowIso()),
    account: { name: String(payload.mode || "Bank") },
    type: "Debit",
    amount,
    description: `Payment received for ${invoice.invoiceNumber}`,
  });

  recalculateCustomerReceivables(state);
  pushActivity(state, `Recorded payment for ${invoice.invoiceNumber}`);
  queueForSync(state, "POST", "accounting/payments", payload);

  return invoice;
}

function profileFromState(state: DesktopLocalState) {
  const currentUser = currentStoredUser();
  return {
    user: currentUser,
    tenant: {
      id: state.workspace.id,
      name: state.workspace.name,
      slug: state.workspace.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    },
  };
}

export function shouldHandleDesktopOfflineRequest(config: InternalAxiosRequestConfig): boolean {
  if (!isDesktopOfflineMode() || !config.url) return false;
  
  // Do NOT intercept authentication, registration, or tenant selection
  // These must always be handled by the cloud backend to enable sync.
  const url = config.url.toLowerCase();
  if (url.includes('auth/login') || 
      url.includes('auth/register') || 
      url.includes('auth/refresh') || 
      url.includes('auth/onboarding') ||
      url.includes('auth/tenants') ||
      url.includes('auth/select-tenant')) {
    return false;
  }

  return true;
}

export async function handleDesktopOfflineRequest(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  const method = (config.method?.toLowerCase() || "get") as HttpMethod;
  const url = normalizeApiPath(config.url);
  const path = url.pathname.replace(/^\/+/, "");
  const state = await getLocalState();

  if (method === "get" && path === "auth/profile") {
    return buildResponse(config, profileFromState(state));
  }

  if (method === "post" && path === "auth/logout") {
    return buildResponse(config, { success: true });
  }

  if (method === "get" && path === "system/config") {
    return buildResponse(config, {
      industry: state.workspace.industry,
      enabledModules: DEFAULT_ENABLED_MODULES,
      terminology: {},
    });
  }

  if (method === "get" && path === "system/stats") {
    return buildResponse(config, {
      apps: MARKETPLACE_APPS.length,
      installed: state.installedApps.length,
      records: state.products.length + state.customers.length + state.invoices.length + state.transactions.length,
      uptime: "Offline Mode",
    });
  }

  if (method === "get" && path === "analytics/summary") {
    return buildResponse(config, buildAnalyticsSummary(state));
  }

  if (method === "get" && path === "analytics/performance") {
    return buildResponse(config, buildPerformanceSeries(state));
  }

  if (method === "get" && path === "analytics/health") {
    const stats = buildAccountingStats(state);
    return buildResponse(config, {
      runRate: stats.income,
      burnRate: stats.expenses,
      growth: stats.income > 0 ? 8 : 0,
      healthScore: state.invoices.length > 0 ? 82 : 100,
      alerts: state.syncQueue.length > 0 ? [`${state.syncQueue.length} sync items pending`] : [],
    });
  }

  if (method === "get" && path === "analytics/activity") {
    return buildResponse(config, state.activities.map((entry) => ({
      message: entry.message,
      user: entry.user,
      time: entry.time,
    })));
  }

  if (method === "get" && path === "analytics/value-chain") {
    return buildResponse(config, buildValueChain(state));
  }

  if (method === "get" && path === "system/health/forecast") {
    return buildResponse(config, buildForecast(state));
  }

  if (method === "get" && path === "system/search") {
    return buildResponse(config, searchResults(state, url.searchParams.get("q") || ""));
  }

  if (method === "get" && path === "system/apps") {
    return buildResponse(config, MARKETPLACE_APPS.map((app) => ({
      ...app,
      installed: state.installedApps.includes(app.name),
    })));
  }

  if (method === "post" && path.startsWith("system/apps/")) {
    const [, , appName, action] = path.split("/");
    if (appName && action === "install" && !state.installedApps.includes(appName)) {
      state.installedApps.push(appName);
    }
    if (appName && action === "uninstall") {
      state.installedApps = state.installedApps.filter((name) => name !== appName);
    }
    queueForSync(state, "POST", path, parseBody(config));
    pushActivity(state, `${action === "install" ? "Installed" : "Uninstalled"} module ${appName}`);
    await saveLocalState(state);
    return buildResponse(config, { success: true });
  }

  if (method === "post" && path === "system/apps/preset") {
    queueForSync(state, "POST", path, parseBody(config));
    pushActivity(state, "Queued business blueprint setup");
    await saveLocalState(state);
    return buildResponse(config, { success: true });
  }

  if (method === "get" && path === "system/founder-dashboard") {
    return buildResponse(config, {
      tenants: [],
      stats: {
        totalTenants: 1,
        activeTenants: 1,
        totalUsers: state.users.length,
      },
    });
  }

  if (method === "get" && path === "system/api/keys") {
    return buildResponse(config, []);
  }

  if ((method === "post" || method === "delete") && path.startsWith("system/api/keys")) {
    queueForSync(state, method.toUpperCase(), path, parseBody(config));
    await saveLocalState(state);
    return buildResponse(config, { success: true });
  }

  if (method === "get" && path === "system/billing/status") {
    return buildResponse(config, {
      plan: "Local Offline",
      quotas: {
        maxUsers: 25,
        maxProducts: 5000,
        aiEnabled: false,
      },
    });
  }

  if (method === "post" && path === "system/billing/upgrade") {
    queueForSync(state, "POST", path, parseBody(config));
    await saveLocalState(state);
    return buildResponse(config, { success: true });
  }

  if (method === "get" && path === "inventory/products/find-by-code") {
    const code = (url.searchParams.get("code") || "").toLowerCase();
    const product = state.products.find((entry) =>
      [entry.sku, entry.barcode, entry.name].some((value) => value.toLowerCase() === code),
    ) || null;
    return buildResponse(config, product);
  }

  if (method === "get" && path === "inventory/products") {
    const page = Number(url.searchParams.get("page") || 1);
    const limit = Number(url.searchParams.get("limit") || Math.max(state.products.length, 50));
    return buildResponse(config, paginate(state.products, page, limit));
  }

  if (method === "post" && path === "inventory/products") {
    const payload = parseBody<Record<string, unknown>>(config);
    const product: LocalProduct = {
      id: makeId("product"),
      name: String(payload.name || "Unnamed Product"),
      sku: String(payload.sku || `PRD-${Date.now().toString().slice(-6)}`),
      stock: Number(payload.stock || 0),
      price: Number(payload.price || 0),
      costPrice: Number(payload.costPrice || 0),
      category: String(payload.category || ""),
      tags: String(payload.tags || ""),
      brand: String(payload.brand || ""),
      manufacturer: String(payload.manufacturer || ""),
      minStockLevel: Number(payload.minStockLevel || 0),
      hsnCode: String(payload.hsnCode || ""),
      gstRate: Number(payload.gstRate || 0),
      description: String(payload.description || ""),
      barcode: String(payload.barcode || ""),
      isService: Boolean(payload.isService),
      updatedAt: nowIso(),
      updatedBy: {
        fullName: currentStoredUser()?.fullName || "Local Owner",
      },
    };

    state.products.unshift(product);
    queueForSync(state, "POST", path, payload);
    pushActivity(state, `Created product ${product.name}`);
    await saveLocalState(state);
    return buildResponse(config, product, 201);
  }

  if (method === "patch" && path.startsWith("inventory/products/")) {
    const productId = path.split("/")[2];
    const payload = parseBody<Record<string, unknown>>(config);
    const product = state.products.find((entry) => entry.id === productId);
    if (!product) {
      buildOfflineError(config, "Product not found in the local workspace.");
    }

    Object.assign(product, {
      ...payload,
      stock: payload.stock !== undefined ? Number(payload.stock) : product.stock,
      price: payload.price !== undefined ? Number(payload.price) : product.price,
      costPrice: payload.costPrice !== undefined ? Number(payload.costPrice) : product.costPrice,
      gstRate: payload.gstRate !== undefined ? Number(payload.gstRate) : product.gstRate,
      minStockLevel: payload.minStockLevel !== undefined ? Number(payload.minStockLevel) : product.minStockLevel,
      updatedAt: nowIso(),
      updatedBy: {
        fullName: currentStoredUser()?.fullName || "Local Owner",
      },
    });

    queueForSync(state, "PATCH", path, payload);
    pushActivity(state, `Updated product ${product.name}`);
    await saveLocalState(state);
    return buildResponse(config, product);
  }

  if (method === "delete" && path.startsWith("inventory/products/")) {
    const productId = path.split("/")[2];
    state.products = state.products.filter((entry) => entry.id !== productId);
    queueForSync(state, "DELETE", path, null);
    pushActivity(state, "Removed a product from local inventory");
    await saveLocalState(state);
    return buildResponse(config, { success: true });
  }

  if (method === "get" && path === "inventory/stats") {
    return buildResponse(config, buildInventoryStats(state));
  }

  if (method === "get" && path === "inventory/warehouses") {
    return buildResponse(config, state.warehouses);
  }

  if (method === "post" && path === "inventory/warehouses") {
    const payload = parseBody<Record<string, unknown>>(config);
    const warehouse: LocalWarehouse = {
      id: makeId("warehouse"),
      name: String(payload.name || "New Warehouse"),
      location: String(payload.location || ""),
      isPrimary: Boolean(payload.isPrimary),
    };
    state.warehouses.unshift(warehouse);
    queueForSync(state, "POST", path, payload);
    await saveLocalState(state);
    return buildResponse(config, warehouse, 201);
  }

  if (method === "patch" && path.startsWith("inventory/warehouses/")) {
    const warehouseId = path.split("/")[2];
    const payload = parseBody<Record<string, unknown>>(config);
    const warehouse = state.warehouses.find((entry) => entry.id === warehouseId);
    if (!warehouse) {
      buildOfflineError(config, "Warehouse not found in the local workspace.");
    }
    Object.assign(warehouse, payload);
    queueForSync(state, "PATCH", path, payload);
    await saveLocalState(state);
    return buildResponse(config, warehouse);
  }

  if (method === "get" && path === "system/ai/inventory-forecast") {
    return buildResponse(config, { recommendations: [] });
  }

  if (method === "get" && path === "crm/customers") {
    const page = Number(url.searchParams.get("page") || 1);
    const limit = Number(url.searchParams.get("limit") || Math.max(state.customers.length, 50));
    return buildResponse(config, paginate(state.customers, page, limit));
  }

  if (method === "post" && path === "crm/customers") {
    const payload = parseBody<Record<string, unknown>>(config);
    const customer: LocalCustomer = {
      id: makeId("customer"),
      firstName: String(payload.firstName || ""),
      lastName: String(payload.lastName || ""),
      email: String(payload.email || ""),
      phone: String(payload.phone || ""),
      company: String(payload.company || `${payload.firstName || ""} ${payload.lastName || ""}`.trim()),
      address: String(payload.address || ""),
      state: String(payload.state || ""),
      gstin: String(payload.gstin || ""),
      status: String(payload.status || "Customer"),
      receivable: 0,
      createdAt: nowIso(),
    };
    state.customers.unshift(customer);
    queueForSync(state, "POST", path, payload);
    pushActivity(state, `Created customer ${customer.company}`);
    await saveLocalState(state);
    return buildResponse(config, customer, 201);
  }

  if (method === "patch" && path.startsWith("crm/customers/")) {
    const customerId = path.split("/")[2];
    const payload = parseBody<Record<string, unknown>>(config);
    const customer = state.customers.find((entry) => entry.id === customerId);
    if (!customer) {
      buildOfflineError(config, "Customer not found in the local workspace.");
    }
    Object.assign(customer, payload);
    queueForSync(state, "PATCH", path, payload);
    await saveLocalState(state);
    return buildResponse(config, customer);
  }

  if (method === "delete" && path.startsWith("crm/customers/")) {
    const customerId = path.split("/")[2];
    state.customers = state.customers.filter((entry) => entry.id !== customerId);
    state.opportunities = state.opportunities.filter((entry) => entry.customerId !== customerId);
    queueForSync(state, "DELETE", path, null);
    await saveLocalState(state);
    return buildResponse(config, { success: true });
  }

  if (method === "get" && path === "crm/stats") {
    return buildResponse(config, {
      totalCustomers: state.customers.filter((customer) => customer.status !== "Lead").length,
      leads: state.customers.filter((customer) => customer.status === "Lead").length,
      pipelineValue: round2(state.opportunities.reduce((sum, opportunity) => sum + opportunity.value, 0)),
      openDeals: state.opportunities.filter((opportunity) => opportunity.stage !== "Closed").length,
    });
  }

  if (method === "get" && path === "crm/opportunities") {
    return buildResponse(config, state.opportunities);
  }

  if (method === "post" && path === "crm/opportunities") {
    const payload = parseBody<Record<string, unknown>>(config);
    const customer = state.customers.find((entry) => entry.id === String(payload.customerId || ""));
    const opportunity: LocalOpportunity = {
      id: makeId("opportunity"),
      title: String(payload.title || "Untitled Deal"),
      value: Number(payload.value || 0),
      stage: String(payload.stage || "New"),
      customerId: String(payload.customerId || ""),
      customer: customer ? { firstName: customer.firstName, lastName: customer.lastName } : undefined,
    };
    state.opportunities.unshift(opportunity);
    queueForSync(state, "POST", path, payload);
    await saveLocalState(state);
    return buildResponse(config, opportunity, 201);
  }

  if (method === "post" && path.startsWith("crm/opportunities/")) {
    const opportunityId = path.split("/")[2];
    const payload = parseBody<Record<string, unknown>>(config);
    const opportunity = state.opportunities.find((entry) => entry.id === opportunityId);
    if (!opportunity) {
      buildOfflineError(config, "Opportunity not found in the local workspace.");
    }
    Object.assign(opportunity, payload, {
      value: payload.value !== undefined ? Number(payload.value) : opportunity.value,
    });
    queueForSync(state, "POST", path, payload);
    await saveLocalState(state);
    return buildResponse(config, opportunity);
  }

  if (method === "get" && path === "accounting/accounts") {
    return buildResponse(config, state.accounts);
  }

  if (method === "post" && path === "accounting/accounts") {
    const payload = parseBody<Record<string, unknown>>(config);
    const account: LocalAccount = {
      id: makeId("account"),
      code: String(payload.code || `A-${Date.now().toString().slice(-4)}`),
      name: String(payload.name || "New Account"),
      type: String(payload.type || "Asset"),
      balance: 0,
      createdAt: nowIso(),
    };
    state.accounts.unshift(account);
    queueForSync(state, "POST", path, payload);
    pushActivity(state, `Created account ${account.name}`);
    await saveLocalState(state);
    return buildResponse(config, account, 201);
  }

  if (method === "get" && path === "accounting/transactions") {
    return buildResponse(config, { data: state.transactions });
  }

  if (method === "get" && path === "accounting/invoices") {
    const page = Number(url.searchParams.get("page") || 1);
    const limit = Number(url.searchParams.get("limit") || Math.max(state.invoices.length, 50));
    return buildResponse(config, paginate(state.invoices, page, limit));
  }

  if (method === "post" && path === "accounting/invoices") {
    const payload = parseBody<Record<string, unknown>>(config);
    const invoice = applyInvoiceToState(state, payload);
    await saveLocalState(state);
    return buildResponse(config, invoice, 201);
  }

  if (method === "post" && path === "accounting/invoices/bulk") {
    const payload = parseBody<Array<Record<string, unknown>>>(config);
    const results = (Array.isArray(payload) ? payload : []).map((entry) => {
      const invoice = applyInvoiceToState(state, entry);
      return {
        status: "SUCCESS" as const,
        invoiceNumber: invoice.invoiceNumber,
      };
    });
    await saveLocalState(state);
    return buildResponse(config, { results });
  }

  if (method === "post" && path.startsWith("accounting/invoices/") && path.endsWith("/cancel")) {
    const invoiceId = path.split("/")[2];
    const invoice = state.invoices.find((entry) => entry.id === invoiceId);
    if (!invoice) {
      buildOfflineError(config, "Invoice not found in the local workspace.");
    }
    invoice.status = "Cancelled";
    queueForSync(state, "POST", path, parseBody(config));
    pushActivity(state, `Cancelled invoice ${invoice.invoiceNumber}`);
    recalculateCustomerReceivables(state);
    await saveLocalState(state);
    return buildResponse(config, invoice);
  }

  if (method === "post" && path === "accounting/payments") {
    const payload = parseBody<Record<string, unknown>>(config);
    const invoice = recordPaymentInState(state, payload);
    await saveLocalState(state);
    return buildResponse(config, invoice);
  }

  if (method === "get" && path === "accounting/stats") {
    return buildResponse(config, buildAccountingStats(state));
  }

  if (method === "get" && path === "accounting/health-score") {
    const stats = buildAccountingStats(state);
    return buildResponse(config, {
      status: stats.receivable > 0 ? "YELLOW" : "BLUE",
      riskScore: stats.receivable > 0 ? 28 : 8,
      metrics: {
        avgEntryLag: 0,
        taggingRatio: "100%",
      },
      signals: state.syncQueue.length > 0 ? ["Cloud sync pending"] : ["Workspace is fully local"],
    });
  }

  if (method === "get" && path === "accounting/leaderboard") {
    const user = currentStoredUser();
    return buildResponse(config, [{
      name: user?.fullName || "Local Owner",
      invoices: state.invoices.length,
      avgLag: 0,
    }]);
  }

  if (method === "get" && path === "accounting/recovery-memory") {
    const opportunities = state.customers
      .filter((customer) => customer.receivable > 0)
      .slice(0, 5)
      .map((customer) => ({
        name: customer.company || `${customer.firstName} ${customer.lastName}`.trim(),
        phone: customer.phone,
        daysSilent: 0,
      }));

    return buildResponse(config, { opportunities });
  }

  if (method === "get" && path === "users") {
    return buildResponse(config, state.users);
  }

  if (method === "post" && path === "users") {
    const payload = parseBody<Record<string, unknown>>(config);
    const member: LocalUser = {
      id: makeId("user"),
      fullName: String(payload.fullName || "Team Member"),
      email: String(payload.email || ""),
      role: String(payload.role || "Biller"),
      isActive: true,
      createdAt: nowIso(),
    };
    state.users.push(member);
    queueForSync(state, "POST", path, payload);
    pushActivity(state, `Added team member ${member.fullName}`);
    await saveLocalState(state);
    return buildResponse(config, member, 201);
  }

  if (method === "patch" && path.startsWith("users/") && path.endsWith("/role")) {
    const userId = path.split("/")[1];
    const payload = parseBody<Record<string, unknown>>(config);
    const member = state.users.find((entry) => entry.id === userId);
    if (!member) {
      buildOfflineError(config, "Team member not found in the local workspace.");
    }
    member.role = String(payload.role || member.role);
    queueForSync(state, "PATCH", path, payload);
    await saveLocalState(state);
    return buildResponse(config, member);
  }

  if (method === "post" && path.startsWith("users/") && path.endsWith("/reset-password")) {
    queueForSync(state, "POST", path, null);
    await saveLocalState(state);
    return buildResponse(config, { temporaryPassword: "LOCAL-ONLY-1234" });
  }

  if (method === "delete" && path.startsWith("users/")) {
    const userId = path.split("/")[1];
    state.users = state.users.filter((entry) => entry.id !== userId);
    queueForSync(state, "DELETE", path, null);
    await saveLocalState(state);
    return buildResponse(config, { success: true });
  }

  if (method === "get" && path === "sales/orders") {
    const page = Number(url.searchParams.get("page") || 1);
    const limit = Number(url.searchParams.get("limit") || Math.max(state.invoices.length, 50));
    const paginatedInvoices = paginate(state.invoices, page, limit);
    const ordersData = {
      ...paginatedInvoices,
      data: paginatedInvoices.data.map(inv => ({
        id: inv.id,
        createdAt: inv.createdAt,
        total: inv.totalAmount,
        status: inv.status,
        customer: inv.customer
      }))
    };
    return buildResponse(config, ordersData);
  }

  if (method === "get" && path === "sales/stats") {
    const activeInvoices = state.invoices.filter((inv) => inv.status !== "Cancelled");
    return buildResponse(config, {
      totalRevenue: round2(activeInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)),
      orderCount: activeInvoices.length,
      pendingOrders: activeInvoices.filter(i => i.status === "Pending").length,
    });
  }

  if (method === "post" && path === "sales/orders") {
    const payload = parseBody<Record<string, unknown>>(config);
    const invoice = applyInvoiceToState(state, payload);
    await saveLocalState(state);
    return buildResponse(config, invoice, 201);
  }

  if (method === "get" && path === "accounting/fixed-assets") {
    return buildResponse(config, state.fixedAssets);
  }

  if (method === "post" && path === "accounting/fixed-assets") {
    const payload = parseBody<Record<string, unknown>>(config);
    const asset: LocalFixedAsset = {
      id: makeId("fa"),
      name: String(payload.name || "Untitled Asset"),
      assetCode: String(payload.assetCode || `FA-${Date.now().toString().slice(-4)}`),
      purchaseDate: String(payload.purchaseDate || nowIso()),
      purchaseValue: String(payload.purchaseValue || "0"),
      salvageValue: String(payload.salvageValue || "0"),
      usefulLife: Number(payload.usefulLife || 60),
      accumulatedDepreciation: "0",
      status: "Active",
      depreciationLogs: []
    };
    state.fixedAssets.unshift(asset);
    queueForSync(state, "POST", path, payload);
    pushActivity(state, `Created fixed asset ${asset.name}`);
    await saveLocalState(state);
    return buildResponse(config, asset, 201);
  }
  
  if (method === "post" && path.startsWith("accounting/fixed-assets/") && path.endsWith("/depreciate")) {
    const assetId = path.split("/")[2];
    const asset = state.fixedAssets.find(a => a.id === assetId);
    if (!asset) buildOfflineError(config, "Asset not found locally.");
    
    const cost = parseFloat(asset.purchaseValue);
    const salvage = parseFloat(asset.salvageValue);
    const life = asset.usefulLife || 60;
    const monthlyDepreciation = cost > 0 && life > 0 ? (cost - salvage) / life : 0;
    
    asset.accumulatedDepreciation = round2(parseFloat(asset.accumulatedDepreciation) + monthlyDepreciation).toString();
    asset.depreciationLogs.unshift({
      id: makeId("dep"),
      amount: round2(monthlyDepreciation).toString(),
      date: nowIso(),
      description: "Monthly Depreciation (Offline)"
    });
    
    queueForSync(state, "POST", path, null);
    await saveLocalState(state);
    return buildResponse(config, { monthlyDepreciation: round2(monthlyDepreciation) });
  }

  if (method === "get" && path === "accounting/auditor/dashboard") {
    const stats = buildAccountingStats(state);
    return buildResponse(config, {
      confidenceScore: state.invoices.length > 0 ? 85 : 100,
      status: state.invoices.length > 0 ? "WARNING" : "CLEAN",
      isLocked: false,
      lockDetails: { lockedAt: nowIso() },
      hsnCoverage: 90,
      riskFlags: [],
      errors: [],
      summary: {
        totalSales: stats.income,
        totalGST: stats.gstLiability,
        totalReceipts: stats.income - stats.receivable,
        totalPayments: stats.expenses,
        netBalanceDr: stats.receivable,
        netBalanceCr: 0
      }
    });
  }

  if (method === "post" && path === "accounting/auditor/lock") {
    queueForSync(state, "POST", path, parseBody(config));
    return buildResponse(config, { success: true });
  }

  if (method === "post" && path === "accounting/auditor/unlock") {
    queueForSync(state, "POST", path, parseBody(config));
    return buildResponse(config, { success: true });
  }

  if (method === "post" && path === "accounting/close-year") {
    queueForSync(state, "POST", path, parseBody(config));
    return buildResponse(config, { message: "Year closing queued for sync" });
  }

  if (method === "post" && path === "auth/onboarding") {
    const payload = parseBody<Record<string, string>>(config);
    state.workspace = {
      ...state.workspace,
      id: makeId("tenant"),
      name: payload.companyName || payload.businessType || state.workspace.name,
      industry: payload.industry || state.workspace.industry,
      updatedAt: nowIso(),
    };
    
    pushActivity(state, `Initialized industrial workspace: ${state.workspace.name} (${state.workspace.industry})`);
    await saveLocalState(state);
    
    // Refresh the dummy token to include the new onboarding status
    await hydrateDesktopOfflineSession();
    
    return buildResponse(config, { success: true, workspace: state.workspace });
  }

  if (method === "get" && path === "hr/employees") {
    return buildResponse(config, state.employees);
  }

  if (method === "get" && path === "hr/stats") {
    return buildResponse(config, {
      totalEmployees: state.employees.length,
      onLeave: state.leaves.filter(l => l.status === "Approved").length,
      newHires: 0,
      payrollTotal: state.employees.reduce((sum, e) => sum + e.salary, 0)
    });
  }

  if (method === "get" && path === "healthcare/patients") {
    return buildResponse(config, state.patients.length > 0 ? state.patients : [
      { id: 'PAT-001', name: 'Sample Patient', age: 40, gender: 'Male', contact: '+91 99999 99999', lastVisit: nowIso(), status: 'Stable' }
    ]);
  }

  if (method === "get" && path === "logistics/stats") {
    return buildResponse(config, {
      totalVehicles: state.shipments.length || 10,
      activeShipments: state.shipments.length,
      efficiency: 92
    });
  }

  if (method === "get" && path === "construction/sites") {
    return buildResponse(config, []);
  }

  if (method === "get" && path === "nbfc/loans") {
    return buildResponse(config, state.loans);
  }

  // --- MANUFACTURING HUB (Offline Zenith Engine) ---

  if (method === "get" && path === "manufacturing/overview") {
    const ordersWithBoms = state.manufacturingOrders.map(wo => ({
      ...wo,
      bom: state.boms.find(b => b.id === wo.bomId)
    }));
    return buildResponse(config, {
      boms: state.boms,
      workOrders: ordersWithBoms,
      machines: state.machines
    });
  }

  if (method === "get" && path === "manufacturing/bom") {
    return buildResponse(config, state.boms);
  }

  if (method === "post" && path === "manufacturing/bom") {
    const payload = parseBody<Record<string, any>>(config);
    const bom: any = {
      id: makeId("bom"),
      productId: payload.productId,
      name: payload.name || "Standard BOM",
      quantity: Number(payload.quantity || 1),
      overheadRate: Number(payload.overheadRate || 0),
      isOverheadFixed: Boolean(payload.isOverheadFixed),
      components: Array.isArray(payload.components) ? payload.components : [],
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    state.boms.unshift(bom);
    queueForSync(state, "POST", "manufacturing/boms", payload);
    pushActivity(state, `Created Bill of Materials for ${bom.name}`);
    await saveLocalState(state);
    return buildResponse(config, bom, 201);
  }

  if (method === "get" && path.startsWith("manufacturing/boms/") && path.endsWith("/cost")) {
    const bomId = path.split("/")[2];
    const bom = state.boms.find(b => b.id === bomId) as any;
    if (!bom) return buildOfflineError(config, "BOM not found locally.");

    const requirements = explodeBOMRecursive(state, bomId, 1);
    let materialCost = 0;
    for (const req of requirements) {
      const product = state.products.find(p => p.id === req.productId) as any;
      materialCost += (Number(product?.costPrice || 0) * req.quantity);
    }

    const overheadCost = bom.isOverheadFixed
      ? Number(bom.overheadRate)
      : (materialCost * Number(bom.overheadRate)) / 100;

    return buildResponse(config, {
      materialCost: round2(materialCost),
      overheadCost: round2(overheadCost),
      totalCost: round2(materialCost + overheadCost),
      items: requirements
    });
  }

  if (method === "get" && path.startsWith("manufacturing/work-orders/") && path.endsWith("/shortages")) {
    const woId = path.split("/")[2];
    const wo = state.manufacturingOrders.find(o => (o as any).id === woId) as any;
    if (!wo) return buildOfflineError(config, "Work order not found.");

    const requirements = explodeBOMRecursive(state, wo.bomId, Number(wo.quantity));
    const shortages = [];

    for (const req of requirements) {
      const product = state.products.find(p => p.id === req.productId) as any;
      const currentStock = Number(product?.stock || 0);
      if (currentStock < req.quantity) {
        shortages.push({
          productId: req.productId,
          productName: product?.name || "Unknown",
          required: req.quantity,
          available: currentStock,
          missing: req.quantity - currentStock
        });
      }
    }
    return buildResponse(config, shortages);
  }

  if (method === "post" && path.startsWith("manufacturing/work-orders/") && path.endsWith("/start")) {
    const woId = path.split("/")[2];
    const payload = parseBody<Record<string, any>>(config);
    const wo = state.manufacturingOrders.find(o => (o as any).id === woId) as any;
    if (!wo) return buildOfflineError(config, "Work order not found.");

    const correlationId = makeCorrelationId();
    const requirements = explodeBOMRecursive(state, wo.bomId, Number(wo.quantity));

    for (const req of requirements) {
      recordProductionMovement(state, {
        productId: req.productId,
        warehouseId: payload.warehouseId || "warehouse-main",
        quantity: req.quantity,
        type: "OUT",
        reference: woId.slice(-6),
        notes: `Production Issue: ${woId.slice(-6)}`,
        correlationId,
        accountId: "acc-rm",
        contraAccountId: "acc-wip"
      });

      recordProductionMovement(state, {
        productId: req.productId,
        warehouseId: payload.warehouseId || "warehouse-main",
        quantity: req.quantity,
        type: "IN",
        reference: woId.slice(-6),
        notes: "WIP_BIN",
        correlationId
      });
    }

    wo.status = "InProgress";
    wo.startDate = nowIso();
    wo.machineId = payload.machineId;
    
    if (payload.machineId) {
      const machine = state.machines.find(m => (m as any).id === payload.machineId) as any;
      if (machine) machine.status = "Running";
    }

    queueForSync(state, "POST", path, payload);
    pushActivity(state, `Production started for Work Order ${woId.slice(-6)}`);
    await saveLocalState(state);
    return buildResponse(config, { success: true });
  }

  if (method === "post" && path.startsWith("manufacturing/work-orders/") && path.endsWith("/complete")) {
    const woId = path.split("/")[2];
    const payload = parseBody<Record<string, any>>(config);
    const wo = state.manufacturingOrders.find(o => (o as any).id === woId) as any;
    if (!wo) return buildOfflineError(config, "Work order not found.");

    const correlationId = makeCorrelationId();
    const bom = state.boms.find(b => b.id === wo.bomId) as any;
    const finishedProductId = bom?.productId;
    const producedQty = Number(payload.producedQuantity || wo.quantity);
    const scrapQty = Number(payload.scrapQuantity || 0);
    const totalConsumedQty = producedQty + scrapQty;

    const requirements = explodeBOMRecursive(state, wo.bomId, totalConsumedQty);

    for (const req of requirements) {
      recordProductionMovement(state, {
        productId: req.productId,
        warehouseId: payload.warehouseId || "warehouse-main",
        quantity: req.quantity,
        type: "OUT",
        reference: woId.slice(-6),
        notes: "WIP_BIN",
        correlationId
      });
    }

    if (finishedProductId) {
      recordProductionMovement(state, {
        productId: finishedProductId,
        warehouseId: payload.warehouseId || "warehouse-main",
        quantity: producedQty,
        type: "IN",
        reference: woId.slice(-6),
        notes: `Production Receipt: ${woId.slice(-6)}`,
        correlationId,
        accountId: "acc-inventory",
        contraAccountId: "acc-wip"
      });
      
      const components = (bom.components as any[]) || [];
      const byproducts = components.filter(c => c.isByproduct);
      for (const bp of byproducts) {
        recordProductionMovement(state, {
          productId: bp.productId,
          warehouseId: payload.warehouseId || "warehouse-main",
          quantity: bp.quantity * (producedQty / (bom.quantity || 1)),
          type: "IN",
          reference: woId.slice(-6),
          notes: `By-product from ${woId.slice(-6)}`,
          correlationId
        });
      }
    }

    wo.status = "Completed";
    wo.endDate = nowIso();
    wo.producedQuantity = producedQty;
    wo.scrapQuantity = scrapQty;
    wo.machineTimeHours = payload.machineTimeHours;
    wo.operatorName = payload.operatorName;

    if (wo.machineId) {
      const machine = state.machines.find(m => (m as any).id === wo.machineId) as any;
      if (machine) machine.status = "Idle";
    }

    queueForSync(state, "POST", path, payload);
    pushActivity(state, `Work Order ${woId.slice(-6)} completed with ${producedQty} units yield.`);
    await saveLocalState(state);
    return buildResponse(config, { success: true });
  }

  if (method === "get" && path === "manufacturing/machines") {
    return buildResponse(config, state.machines);
  }

  if (method === "post" && path === "manufacturing/machines") {
    const payload = parseBody<Record<string, any>>(config);
    const machine: LocalMachine = {
      id: makeId("mac"),
      name: payload.name || "New Machine",
      code: payload.code || `M-${Date.now().toString().slice(-4)}`,
      type: payload.type || "Generic",
      status: "Idle",
      hourlyRate: Number(payload.hourlyRate || 0)
    };
    state.machines.push(machine);
    queueForSync(state, "POST", path, payload);
    await saveLocalState(state);
    return buildResponse(config, machine, 201);
  }

  if (method === "post" && path === "manufacturing/work-orders") {
    const payload = parseBody<Record<string, any>>(config);
    const wo: LocalWorkOrder = {
      id: makeId("wo"),
      bomId: payload.bomId,
      orderNumber: `WO-${Date.now().toString().slice(-6)}`,
      quantity: Number(payload.quantity || 1),
      status: "Planned",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    state.manufacturingOrders.push(wo);
    queueForSync(state, "POST", "manufacturing/work-orders", payload);
    await saveLocalState(state);
    return buildResponse(config, wo, 201);
  }

  // Fallback for industrial modules that are initialized but have no local data yet.
  // Instead of erroring, we allow GET requests to return empty arrays so the UI can load and then sync.
  if (method === "get") {
    return buildResponse(config, []);
  }

  return buildOfflineError(config, "This industry module is initialized but has no local data yet. Please click 'Sync' to pull your cloud data.");
}
