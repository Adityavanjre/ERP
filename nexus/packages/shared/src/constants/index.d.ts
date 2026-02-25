export declare enum Industry {
    Manufacturing = "Manufacturing",
    Retail = "Retail",
    Wholesale = "Wholesale",
    Construction = "Construction",
    Healthcare = "Healthcare",
    Education = "Education",
    Logistics = "Logistics",
    RealEstate = "RealEstate",
    NBFC = "NBFC",
    Service = "Service",
    Gov = "Gov",
    General = "General"
}
export declare enum Role {
    Owner = "Owner",
    Manager = "Manager",
    Biller = "Biller",
    Storekeeper = "Storekeeper",
    Accountant = "Accountant",
    CA = "CA",
    Customer = "Customer",
    Supplier = "Supplier"
}
export declare enum Permission {
    CREATE_INVOICE = "CREATE_INVOICE",
    EDIT_INVOICE = "EDIT_INVOICE",
    DELETE_INVOICE = "DELETE_INVOICE",
    RECORD_PAYMENT = "RECORD_PAYMENT",
    ADJUST_STOCK = "ADJUST_STOCK",
    VIEW_PRODUCTS = "VIEW_PRODUCTS",
    LOCK_MONTH = "LOCK_MONTH",
    EXPORT_TALLY = "EXPORT_TALLY",
    VIEW_REPORTS = "VIEW_REPORTS",
    ACCESS_HEALTH_CORE = "ACCESS_HEALTH_CORE",
    MANAGE_USERS = "MANAGE_USERS"
}
export type AccessChannel = 'WEB' | 'MOBILE' | 'API';
export interface IndustryModuleConfig {
    enabledModules: string[];
    mobileRestrictedModules?: string[];
    terminology: Record<string, string>;
}
export declare const INDUSTRY_CONFIGS: Record<string, IndustryModuleConfig>;
export declare const RolePermissions: Record<string, Permission[]>;
export * from './mobile-whitelist';
