export enum Industry {
    Manufacturing = 'Manufacturing',
    Retail = 'Retail',
    Wholesale = 'Wholesale',
    Construction = 'Construction',
    Healthcare = 'Healthcare',
    Education = 'Education',
    Logistics = 'Logistics',
    RealEstate = 'RealEstate',
    NBFC = 'NBFC',
    Service = 'Service',
    Gov = 'Gov',
    General = 'General'
}

export enum Role {
    Owner = 'Owner',
    Manager = 'Manager',
    Biller = 'Biller',
    Storekeeper = 'Storekeeper',
    Accountant = 'Accountant',
    CA = 'CA',
    Customer = 'Customer',
    Supplier = 'Supplier'
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
    MANAGE_USERS = 'MANAGE_USERS',
    MANAGE_ACCOUNTS = 'MANAGE_ACCOUNTS',
    MANAGE_INVENTORY = 'MANAGE_INVENTORY',
    MANAGE_CUSTOMERS = 'MANAGE_CUSTOMERS',
    MANAGE_SUPPLIERS = 'MANAGE_SUPPLIERS',
    MANAGE_EMPLOYEES = 'MANAGE_EMPLOYEES',
}

export type AccessChannel = 'WEB' | 'MOBILE' | 'API';

export interface IndustryModuleConfig {
    enabledModules: string[];
    mobileRestrictedModules?: string[]; // Modules disabled for MOBILE channel
    terminology: Record<string, string>;
}

export const INDUSTRY_CONFIGS: Record<string, IndustryModuleConfig> = {
    [Industry.Manufacturing]: {
        enabledModules: ['accounting', 'inventory', 'manufacturing', 'hr', 'crm', 'purchases', 'sales'],
        mobileRestrictedModules: ['accounting'], // Risk management: No heavy accounting on mobile
        terminology: {
            customer: 'Customer',
            product: 'Item/Product',
            inventory: 'Stock',
            department: 'Production Department',
            'Work Order': 'Job Card'
        }
    },
    [Industry.Retail]: {
        enabledModules: ['accounting', 'inventory', 'crm', 'purchases', 'hr', 'sales'],
        terminology: {
            customer: 'Shopper/Consumer',
            product: 'Stock Item',
            inventory: 'Shelf Stock',
            department: 'Store Section'
        }
    },
    [Industry.Construction]: {
        enabledModules: ['accounting', 'inventory', 'hr', 'purchases', 'crm', 'projects', 'construction', 'sales'],
        terminology: {
            customer: 'Principal/Owner',
            product: 'Building Material',
            inventory: 'Site Inventory',
            department: 'Project Site'
        }
    },
    [Industry.Healthcare]: {
        enabledModules: ['accounting', 'inventory', 'hr', 'purchases', 'crm', 'healthcare', 'sales'],
        terminology: {
            customer: 'Patient',
            product: 'Medicine/Service',
            inventory: 'Pharmacy Stock',
            department: 'Ward/Unit'
        }
    },
    [Industry.Logistics]: {
        enabledModules: ['accounting', 'inventory', 'hr', 'purchases', 'crm', 'logistics', 'sales'],
        terminology: {
            customer: 'Client/Receiver',
            product: 'Consumable/Fuel',
            inventory: 'Warehouse Stock',
            department: 'Fleet Team'
        }
    },
    [Industry.NBFC]: {
        enabledModules: ['accounting', 'hr', 'crm', 'purchases', 'nbfc', 'sales'],
        terminology: {
            customer: 'Borrower',
            product: 'Loan Product',
            inventory: 'Collateral Assets',
            department: 'Branch/Unit'
        }
    },
    [Industry.Service]: {
        enabledModules: ['accounting', 'hr', 'crm', 'purchases', 'projects', 'sales'],
        terminology: {
            customer: 'Client',
            product: 'Service Item',
            inventory: 'Supplies',
            department: 'Department'
        }
    },
    [Industry.Wholesale]: {
        enabledModules: ['accounting', 'inventory', 'crm', 'purchases', 'hr', 'sales'],
        terminology: {
            customer: 'Distributor/Vendor',
            product: 'Bulk Commodity',
            inventory: 'Warehouse Inventory',
            department: 'Logistics Bay'
        }
    },
    [Industry.RealEstate]: {
        enabledModules: ['accounting', 'hr', 'crm', 'purchases', 'projects', 'sales'],
        terminology: {
            customer: 'Tenant/Lead',
            product: 'Property/Unit',
            inventory: 'Assets',
            department: 'Estate/Wing'
        }
    },
    [Industry.Education]: {
        enabledModules: ['accounting', 'hr', 'crm', 'purchases', 'sales'],
        terminology: {
            customer: 'Student/Parent',
            product: 'Course/Service',
            inventory: 'Institutional Supplies',
            department: 'Academic Dept'
        }
    },
    [Industry.Gov]: {
        enabledModules: ['accounting', 'hr', 'crm', 'purchases'],
        terminology: {
            customer: 'Citizen',
            product: 'Service',
            inventory: 'Public Assets',
            department: 'Department'
        }
    },
    [Industry.General]: {
        enabledModules: ['accounting', 'inventory', 'hr', 'crm', 'purchases'],
        terminology: {
            customer: 'Customer',
            product: 'Product',
            inventory: 'Inventory',
            department: 'Department'
        }
    }
};

export const RolePermissions: Record<string, Permission[]> = {
    [Role.Owner]: Object.values(Permission),
    [Role.Manager]: [
        Permission.CREATE_INVOICE,
        Permission.EDIT_INVOICE,
        Permission.RECORD_PAYMENT,
        Permission.ADJUST_STOCK,
        Permission.VIEW_PRODUCTS,
        Permission.VIEW_REPORTS,
        Permission.EXPORT_TALLY,
        Permission.MANAGE_ACCOUNTS,
        Permission.MANAGE_INVENTORY,
        Permission.MANAGE_CUSTOMERS,
        Permission.MANAGE_SUPPLIERS,
        Permission.MANAGE_EMPLOYEES,
    ],
    [Role.Biller]: [
        Permission.CREATE_INVOICE,
        Permission.RECORD_PAYMENT,
        Permission.VIEW_PRODUCTS,
    ],
    [Role.Storekeeper]: [Permission.ADJUST_STOCK, Permission.VIEW_PRODUCTS],
    [Role.Accountant]: [
        Permission.VIEW_REPORTS,
        Permission.LOCK_MONTH,
        Permission.EXPORT_TALLY,
        Permission.VIEW_PRODUCTS,
        Permission.MANAGE_ACCOUNTS,
        Permission.MANAGE_INVENTORY,
    ],
    [Role.CA]: [
        Permission.VIEW_REPORTS,
        Permission.VIEW_PRODUCTS,
        Permission.MANAGE_ACCOUNTS,
        Permission.MANAGE_EMPLOYEES,
    ],
    [Role.Customer]: [],
    [Role.Supplier]: [],
};

export * from './mobile-whitelist';
