"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolePermissions = exports.INDUSTRY_CONFIGS = exports.Permission = exports.Role = exports.Industry = void 0;
var Industry;
(function (Industry) {
    Industry["Manufacturing"] = "Manufacturing";
    Industry["Retail"] = "Retail";
    Industry["Wholesale"] = "Wholesale";
    Industry["Construction"] = "Construction";
    Industry["Healthcare"] = "Healthcare";
    Industry["Education"] = "Education";
    Industry["Logistics"] = "Logistics";
    Industry["RealEstate"] = "RealEstate";
    Industry["NBFC"] = "NBFC";
    Industry["Service"] = "Service";
    Industry["Gov"] = "Gov";
    Industry["General"] = "General";
})(Industry || (exports.Industry = Industry = {}));
var Role;
(function (Role) {
    Role["Owner"] = "Owner";
    Role["Manager"] = "Manager";
    Role["Biller"] = "Biller";
    Role["Storekeeper"] = "Storekeeper";
    Role["Accountant"] = "Accountant";
    Role["CA"] = "CA";
    Role["Customer"] = "Customer";
    Role["Supplier"] = "Supplier";
})(Role || (exports.Role = Role = {}));
var Permission;
(function (Permission) {
    Permission["CREATE_INVOICE"] = "CREATE_INVOICE";
    Permission["EDIT_INVOICE"] = "EDIT_INVOICE";
    Permission["DELETE_INVOICE"] = "DELETE_INVOICE";
    Permission["RECORD_PAYMENT"] = "RECORD_PAYMENT";
    Permission["ADJUST_STOCK"] = "ADJUST_STOCK";
    Permission["VIEW_PRODUCTS"] = "VIEW_PRODUCTS";
    Permission["LOCK_MONTH"] = "LOCK_MONTH";
    Permission["EXPORT_TALLY"] = "EXPORT_TALLY";
    Permission["VIEW_REPORTS"] = "VIEW_REPORTS";
    Permission["ACCESS_HEALTH_CORE"] = "ACCESS_HEALTH_CORE";
    Permission["MANAGE_USERS"] = "MANAGE_USERS";
    Permission["MANAGE_ACCOUNTS"] = "MANAGE_ACCOUNTS";
    Permission["MANAGE_INVENTORY"] = "MANAGE_INVENTORY";
    Permission["MANAGE_CUSTOMERS"] = "MANAGE_CUSTOMERS";
    Permission["MANAGE_SUPPLIERS"] = "MANAGE_SUPPLIERS";
    Permission["MANAGE_EMPLOYEES"] = "MANAGE_EMPLOYEES";
})(Permission || (exports.Permission = Permission = {}));
exports.INDUSTRY_CONFIGS = {
    [Industry.Manufacturing]: {
        enabledModules: ['accounting', 'inventory', 'manufacturing', 'hr', 'crm', 'purchases', 'sales'],
        mobileRestrictedModules: ['accounting'],
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
exports.RolePermissions = {
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
__exportStar(require("./mobile-whitelist"), exports);
//# sourceMappingURL=index.js.map