import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

const DATA_FILE = 'nexus-local-data.json';

export interface LocalDataState {
  version: 1;
  workspace: {
    id: string;
    name: string;
    industry: string;
    currency: string;
    createdAt: string;
    updatedAt: string;
  };
  users: Array<{
    id: string;
    fullName: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
  }>;
  warehouses: Array<{
    id: string;
    name: string;
    location: string;
    isPrimary: boolean;
  }>;
  stockMovements: Array<Record<string, unknown>>;
  stockLocations: Array<Record<string, unknown>>;
  products: Array<Record<string, unknown>>;
  customers: Array<Record<string, unknown>>;
  opportunities: Array<Record<string, unknown>>;
  accounts: Array<Record<string, unknown>>;
  transactions: Array<Record<string, unknown>>;
  invoices: Array<Record<string, unknown>>;
  activities: Array<Record<string, unknown>>;
  syncQueue: Array<Record<string, unknown>>;
  employees: Array<Record<string, unknown>>;
  leaves: Array<Record<string, unknown>>;
  patients: Array<Record<string, unknown>>;
  shipments: Array<Record<string, unknown>>;
  loans: Array<Record<string, unknown>>;
  machines: Array<Record<string, unknown>>;
  boms: Array<Record<string, unknown>>;
  manufacturingOrders: Array<Record<string, unknown>>;
  fixedAssets: Array<Record<string, unknown>>;
  installedApps: string[];
}

function buildDefaultState(): LocalDataState {
  const now = new Date().toISOString();

  return {
    version: 1,
    workspace: {
      id: 'local-workspace',
      name: 'Local Workspace',
      industry: 'General',
      currency: 'INR',
      createdAt: now,
      updatedAt: now,
    },
    users: [
      {
        id: 'local-owner',
        fullName: 'Local Owner',
        email: 'owner@local.erp',
        role: 'Owner',
        isActive: true,
        createdAt: now,
      },
    ],
    warehouses: [
      {
        id: 'warehouse-main',
        name: 'Main Warehouse',
        location: 'Local Device',
        isPrimary: true,
      },
      {
        id: 'warehouse-wip',
        name: 'Work In Progress (WIP)',
        location: 'Factory Floor',
        isPrimary: false,
      },
    ],
    stockMovements: [],
    stockLocations: [],
    products: [],
    customers: [],
    opportunities: [],
    accounts: [
      { id: 'acc-cash', code: '1001', name: 'Cash in Hand', type: 'Asset', balance: 0, createdAt: now },
      { id: 'acc-bank', code: '1002', name: 'Bank Account', type: 'Asset', balance: 0, createdAt: now },
      { id: 'acc-sales', code: '4001', name: 'Sales', type: 'Income', balance: 0, createdAt: now },
      { id: 'acc-inventory', code: '1200', name: 'Inventory', type: 'Asset', balance: 0, createdAt: now },
      { id: 'acc-receivable', code: '1100', name: 'Accounts Receivable', type: 'Asset', balance: 0, createdAt: now },
      { id: 'acc-wip', code: '1210', name: 'Work in Progress (WIP)', type: 'Asset', balance: 0, createdAt: now },
      { id: 'acc-rm', code: '1220', name: 'Raw Materials', type: 'Asset', balance: 0, createdAt: now },
    ],
    transactions: [],
    invoices: [],
    activities: [],
    syncQueue: [],
    employees: [],
    leaves: [],
    patients: [],
    shipments: [],
    loans: [],
    machines: [],
    boms: [],
    manufacturingOrders: [],
    fixedAssets: [],
    installedApps: ['inventory-core', 'accounting-core', 'crm-core'],
  };
}

export class LocalDataStore {
  private readonly dataPath: string;

  constructor() {
    this.dataPath = path.join(app.getPath('userData'), DATA_FILE);
  }

  get(): LocalDataState {
    try {
      if (!fs.existsSync(this.dataPath)) {
        const seeded = buildDefaultState();
        this.set(seeded);
        return seeded;
      }

      return JSON.parse(fs.readFileSync(this.dataPath, 'utf8')) as LocalDataState;
    } catch {
      const seeded = buildDefaultState();
      this.set(seeded);
      return seeded;
    }
  }

  set(state: LocalDataState): LocalDataState {
    const nextState: LocalDataState = {
      ...state,
      version: 1,
      workspace: {
        ...state.workspace,
        updatedAt: new Date().toISOString(),
      },
    };

    fs.writeFileSync(this.dataPath, JSON.stringify(nextState, null, 2));
    return nextState;
  }

  reset(): LocalDataState {
    const seeded = buildDefaultState();
    this.set(seeded);
    return seeded;
  }
}
