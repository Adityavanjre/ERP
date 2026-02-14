
export enum Role {
  Owner = 'Owner',
  Manager = 'Manager',
  Biller = 'Biller',
  Storekeeper = 'Storekeeper',
  Accountant = 'Accountant',
  CA = 'CA'
}

export enum Permission {
  // Invoices
  CREATE_INVOICE = 'CREATE_INVOICE',
  EDIT_INVOICE = 'EDIT_INVOICE',
  DELETE_INVOICE = 'DELETE_INVOICE',
  
  // Payments
  RECORD_PAYMENT = 'RECORD_PAYMENT',
  
  // Inventory
  ADJUST_STOCK = 'ADJUST_STOCK',
  VIEW_PRODUCTS = 'VIEW_PRODUCTS',
  
  // Accounting
  LOCK_MONTH = 'LOCK_MONTH',
  EXPORT_TALLY = 'EXPORT_TALLY',
  VIEW_REPORTS = 'VIEW_REPORTS',
  
  // Advanced
  ACCESS_HEALTH_CORE = 'ACCESS_HEALTH_CORE',
  MANAGE_USERS = 'MANAGE_USERS'
}

export const RolePermissions: Record<string, Permission[]> = {
  [Role.Owner]: Object.values(Permission),
  [Role.Manager]: [
    Permission.CREATE_INVOICE, Permission.EDIT_INVOICE,
    Permission.RECORD_PAYMENT, Permission.ADJUST_STOCK,
    Permission.VIEW_PRODUCTS, Permission.VIEW_REPORTS,
    Permission.EXPORT_TALLY
  ],
  [Role.Biller]: [
    Permission.CREATE_INVOICE, Permission.RECORD_PAYMENT,
    Permission.VIEW_PRODUCTS
  ],
  [Role.Storekeeper]: [
    Permission.ADJUST_STOCK, Permission.VIEW_PRODUCTS
  ],
  [Role.Accountant]: [
    Permission.VIEW_REPORTS, Permission.LOCK_MONTH,
    Permission.EXPORT_TALLY, Permission.VIEW_PRODUCTS
  ],
  [Role.CA]: [
    Permission.VIEW_REPORTS, Permission.VIEW_PRODUCTS
  ]
};
