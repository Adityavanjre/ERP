/**
 * Klypso Nexus Shared Contracts
 * This package houses the source-of-truth for cross-workspace interfaces.
 */

export type AccessChannel = 'WEB' | 'MOBILE' | 'DESKTOP' | 'ADMIN';

export enum Role {
  Owner = 'Owner',
  Manager = 'Manager',
  Accountant = 'Accountant',
  Biller = 'Biller',
  Storekeeper = 'Storekeeper',
  CA = 'CA',
  Operator = 'Operator',
  SuperAdmin = 'SuperAdmin',
}

export enum AccountType {
  Asset = 'Asset',
  Liability = 'Liability',
  Equity = 'Equity',
  Revenue = 'Revenue',
  Expense = 'Expense',
}

export enum Permission {
  VIEW_REPORTS = 'VIEW_REPORTS',
  MANAGE_USERS = 'MANAGE_USERS',
  MANAGE_SETTINGS = 'MANAGE_SETTINGS',
  CREATE_INVOICE = 'CREATE_INVOICE',
  VIEW_INVOICES = 'VIEW_INVOICES',
  MANAGE_INVENTORY = 'MANAGE_INVENTORY',
  MANAGE_ACCOUNTING = 'MANAGE_ACCOUNTING',
  MANAGE_ACCOUNTS = 'MANAGE_ACCOUNTS',
  ACCESS_HEALTH_CORE = 'ACCESS_HEALTH_CORE',
  LOCK_MONTH = 'LOCK_MONTH',
  RECORD_PAYMENT = 'RECORD_PAYMENT',
  EXPORT_TALLY = 'EXPORT_TALLY',
  DELETE_INVOICE = 'DELETE_INVOICE',
  MANAGE_CUSTOMERS = 'MANAGE_CUSTOMERS',
  MANAGE_SUPPLIERS = 'MANAGE_SUPPLIERS',
  MANAGE_LEADS = 'MANAGE_LEADS',
  MANAGE_TASKS = 'MANAGE_TASKS',
  MANAGE_MOM = 'MANAGE_MOM',
  VIEW_MOM = 'VIEW_MOM',
  MANAGE_ATTENDANCE = 'MANAGE_ATTENDANCE',
  MANAGE_PAYROLL = 'MANAGE_PAYROLL',
  MANAGE_MACHINES = 'MANAGE_MACHINES',
  MANAGE_PRODUCTION = 'MANAGE_PRODUCTION',
  MANAGE_PROJECTS = 'MANAGE_PROJECTS',
  MANAGE_LOGISTICS = 'MANAGE_LOGISTICS',
  MANAGE_EMPLOYEES = 'MANAGE_EMPLOYEES',
  MANAGE_LEAVE = 'MANAGE_LEAVE',
  MANAGE_ASSETS = 'MANAGE_ASSETS',
  VIEW_PRODUCTS = 'VIEW_PRODUCTS',
  MANAGE_PRODUCTS = 'MANAGE_PRODUCTS',
  ADJUST_STOCK = 'ADJUST_STOCK',
}

export const RolePermissions: Record<string, Permission[]> = {
  OWNER: Object.values(Permission),
  SUPERADMIN: Object.values(Permission),
  MANAGER: [
    Permission.VIEW_REPORTS, 
    Permission.VIEW_INVOICES, 
    Permission.CREATE_INVOICE, 
    Permission.MANAGE_CUSTOMERS, 
    Permission.MANAGE_LEADS, 
    Permission.MANAGE_TASKS,
    Permission.MANAGE_PRODUCTION,
    Permission.MANAGE_MACHINES,
    Permission.MANAGE_INVENTORY
  ],
  ACCOUNTANT: [Permission.VIEW_REPORTS, Permission.MANAGE_ACCOUNTING, Permission.VIEW_INVOICES, Permission.MANAGE_ACCOUNTS, Permission.EXPORT_TALLY],
  OPERATOR: [Permission.CREATE_INVOICE, Permission.VIEW_INVOICES, Permission.MANAGE_CUSTOMERS],
  BILLER: [Permission.CREATE_INVOICE, Permission.VIEW_INVOICES, Permission.RECORD_PAYMENT],
  STOREKEEPER: [Permission.VIEW_INVOICES, Permission.MANAGE_INVENTORY],
  CA: [Permission.VIEW_REPORTS, Permission.MANAGE_ACCOUNTING, Permission.LOCK_MONTH, Permission.EXPORT_TALLY],
};

export interface MobileFeatureConfig {
  requiredRoles: string[];
  requiredIndustries?: Industry[];
  allowedStatusTransitions?: { to: string }[];
}

export const MOBILE_WHITELIST: Record<string, MobileFeatureConfig> = {
  SELECT_TENANT: { requiredRoles: ['OWNER', 'MANAGER', 'ACCOUNTANT', 'OPERATOR', 'SUPERADMIN', 'BILLER', 'STOREKEEPER'] },
  VIEW_TENANTS: { requiredRoles: ['OWNER', 'MANAGER', 'ACCOUNTANT', 'OPERATOR', 'SUPERADMIN', 'BILLER', 'STOREKEEPER'] },
  ONBOARDING: { requiredRoles: ['OWNER', 'MANAGER', 'ACCOUNTANT', 'OPERATOR', 'SUPERADMIN'] },
  CREATE_WORKSPACE: { requiredRoles: ['OWNER', 'SUPERADMIN'] },
  VIEW_PROFILE: { requiredRoles: ['OWNER', 'MANAGER', 'ACCOUNTANT', 'OPERATOR', 'SUPERADMIN', 'BILLER', 'STOREKEEPER'] },
  VIEW_LEADS: { requiredRoles: ['OWNER', 'MANAGER', 'BILLER', 'OPERATOR'] },
  CREATE_LEAD: { requiredRoles: ['OWNER', 'MANAGER', 'BILLER', 'OPERATOR'] },
  MARK_ATTENDANCE: { requiredRoles: ['OWNER', 'MANAGER', 'ACCOUNTANT', 'OPERATOR', 'BILLER', 'STOREKEEPER'] },
};

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: 'OWNER' | 'ACCOUNTANT' | 'OPERATOR' | 'SUPERADMIN';
  tenantId: string;
}

export interface TenantConfig {
  id: string;
  name: string;
  industry: string;
  currency: string;
}

// Industry Verticals
export enum Industry {
  Retail = 'Retail',
  Manufacturing = 'Manufacturing',
  Healthcare = 'Healthcare',
  Construction = 'Construction',
  Logistics = 'Logistics',
  Automotive = 'Automotive',
  NBFC = 'NBFC',
  Ecommerce = 'Ecommerce',
  Service = 'Service',
  General = 'General',
}

export interface IndustryModuleConfig {
  hasInventory: boolean;
  hasProjects: boolean;
  hasHealthcare: boolean;
  hasManufacturing: boolean;
  hasLogistics: boolean;
  hasFinance: boolean;
  enabledModules: string[];
  mobileRestrictedModules: string[];
  terminology: Record<string, string>;
}

export const INDUSTRY_CONFIGS: Record<string, IndustryModuleConfig> = {
  [Industry.General]: {
    hasInventory: true,
    hasProjects: false,
    hasHealthcare: false,
    hasManufacturing: false,
    hasLogistics: false,
    hasFinance: false,
    enabledModules: ['dashboard', 'sales', 'inventory', 'accounting', 'crm'],
    mobileRestrictedModules: ['accounting'],
    terminology: {
      Product: 'Product',
      Customer: 'Customer',
      Invoice: 'Invoice',
      Project: 'Project',
    },
  },
  [Industry.Retail]: {
    hasInventory: true,
    hasProjects: false,
    hasHealthcare: false,
    hasManufacturing: false,
    hasLogistics: false,
    hasFinance: false,
    enabledModules: ['dashboard', 'sales', 'inventory', 'accounting', 'crm', 'pos'],
    mobileRestrictedModules: ['accounting'],
    terminology: {
      Product: 'Item',
      Customer: 'Buyer',
      Invoice: 'Bill',
      Project: 'Event',
    },
  },
  [Industry.Construction]: {
    hasInventory: true,
    hasProjects: true,
    hasHealthcare: false,
    hasManufacturing: false,
    hasLogistics: false,
    hasFinance: false,
    enabledModules: ['dashboard', 'projects', 'inventory', 'accounting', 'construction'],
    mobileRestrictedModules: ['accounting'],
    terminology: {
      Product: 'Material',
      Customer: 'Contractor',
      Invoice: 'RA Bill',
      Project: 'Site',
      BOM: 'BOQ',
    },
  },
  [Industry.Healthcare]: {
    hasInventory: true,
    hasProjects: false,
    hasHealthcare: true,
    hasManufacturing: false,
    hasLogistics: false,
    hasFinance: false,
    enabledModules: ['dashboard', 'healthcare', 'inventory', 'accounting', 'hr'],
    mobileRestrictedModules: ['accounting'],
    terminology: {
      Product: 'Medicine',
      Customer: 'Patient',
      Invoice: 'Prescription',
      Project: 'Clinic',
    },
  },
  [Industry.Manufacturing]: {
    hasInventory: true,
    hasProjects: false,
    hasHealthcare: false,
    hasManufacturing: true,
    hasLogistics: false,
    hasFinance: false,
    enabledModules: ['dashboard', 'manufacturing', 'inventory', 'accounting', 'sales', 'purchases', 'crm', 'hr'],
    mobileRestrictedModules: ['accounting'],
    terminology: {
      Product: 'Finished Good',
      Customer: 'Distributor',
      Invoice: 'Sales Order',
      Project: 'Production Unit',
      BOM: 'BOM',
      WorkOrder: 'Work Order',
    },
  },
  [Industry.Logistics]: {
    hasInventory: true,
    hasProjects: false,
    hasHealthcare: false,
    hasManufacturing: false,
    hasLogistics: true,
    hasFinance: false,
    enabledModules: ['dashboard', 'logistics', 'inventory', 'accounting', 'sales'],
    mobileRestrictedModules: ['accounting'],
    terminology: {
      Product: 'Consignment',
      Customer: 'Consignor',
      Invoice: 'Freight Bill',
      Project: 'Route',
    },
  },
  [Industry.NBFC]: {
    hasInventory: false,
    hasProjects: false,
    hasHealthcare: false,
    hasManufacturing: false,
    hasLogistics: false,
    hasFinance: true,
    enabledModules: ['dashboard', 'nbfc', 'accounting', 'crm', 'hr'],
    mobileRestrictedModules: ['accounting'],
    terminology: {
      Product: 'Loan Product',
      Customer: 'Borrower',
      Invoice: 'EMI Statement',
      Project: 'Branch',
    },
  },
  [Industry.Automotive]: {
    hasInventory: true,
    hasProjects: false,
    hasHealthcare: false,
    hasManufacturing: true,
    hasLogistics: false,
    hasFinance: false,
    enabledModules: ['dashboard', 'manufacturing', 'inventory', 'accounting', 'sales', 'crm'],
    mobileRestrictedModules: ['accounting'],
    terminology: {
      Product: 'Spare Part',
      Customer: 'Vehicle Owner',
      Invoice: 'Service Bill',
      Project: 'Workshop',
    },
  },
  [Industry.Ecommerce]: {
    hasInventory: true,
    hasProjects: false,
    hasHealthcare: false,
    hasManufacturing: false,
    hasLogistics: true,
    hasFinance: false,
    enabledModules: ['dashboard', 'sales', 'inventory', 'accounting', 'logistics', 'pos'],
    mobileRestrictedModules: ['accounting'],
    terminology: {
      Product: 'SKU Item',
      Customer: 'Buyer',
      Invoice: 'Marketplace Bill',
      Project: 'Fulfillment',
    },
  },
  [Industry.Service]: {
    hasInventory: false,
    hasProjects: true,
    hasHealthcare: false,
    hasManufacturing: false,
    hasLogistics: false,
    hasFinance: false,
    enabledModules: ['dashboard', 'projects', 'accounting', 'crm', 'hr'],
    mobileRestrictedModules: ['accounting'],
    terminology: {
      Product: 'Service Package',
      Customer: 'Client',
      Invoice: 'Service Invoice',
      Project: 'Engagement',
    },
  },
};

// 429 Mitigation Constants
export const RATE_LIMIT_MULTIPLIER = {
  OWNER: 10,
  ACCOUNTANT: 5,
  OPERATOR: 2,
};
