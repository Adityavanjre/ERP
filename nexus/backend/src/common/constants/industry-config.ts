export enum Industry {
    Manufacturing = 'Manufacturing',
    Retail = 'Retail',
    Construction = 'Construction',
    Healthcare = 'Healthcare',
    Logistics = 'Logistics',
    NBFC = 'NBFC',
    Service = 'Service',
    General = 'General'
}

export interface IndustryModuleConfig {
    enabledModules: string[];
    terminology: Record<string, string>;
}

export const INDUSTRY_CONFIGS: Record<string, IndustryModuleConfig> = {
    [Industry.Manufacturing]: {
        enabledModules: ['accounting', 'inventory', 'manufacturing', 'hr', 'crm', 'purchases'],
        terminology: {
            customer: 'Customer',
            product: 'Item/Product',
            inventory: 'Stock',
            department: 'Production Department'
        }
    },
    [Industry.Retail]: {
        enabledModules: ['accounting', 'inventory', 'crm', 'purchases', 'hr'],
        terminology: {
            customer: 'Customer',
            product: 'Product/SKU',
            inventory: 'Inventory',
            department: 'Store Section'
        }
    },
    [Industry.Construction]: {
        enabledModules: ['accounting', 'inventory', 'hr', 'purchases', 'crm', 'projects', 'construction'],
        terminology: {
            customer: 'Client',
            product: 'Material',
            inventory: 'Site Stock',
            department: 'Site Team'
        }
    },
    [Industry.Healthcare]: {
        enabledModules: ['accounting', 'inventory', 'hr', 'purchases', 'crm', 'healthcare'],
        terminology: {
            customer: 'Patient',
            product: 'Medicine/Service',
            inventory: 'Pharmacy Stock',
            department: 'Ward/Unit'
        }
    },
    [Industry.Logistics]: {
        enabledModules: ['accounting', 'inventory', 'hr', 'purchases', 'crm', 'logistics'],
        terminology: {
            customer: 'Client/Receiver',
            product: 'Consumable/Fuel',
            inventory: 'Warehouse Stock',
            department: 'Fleet Team'
        }
    },
    [Industry.NBFC]: {
        enabledModules: ['accounting', 'hr', 'crm', 'purchases', 'nbfc'],
        terminology: {
            customer: 'Borrower',
            product: 'Loan Product',
            inventory: 'Collateral Assets',
            department: 'Branch/Unit'
        }
    },
    [Industry.Service]: {
        enabledModules: ['accounting', 'hr', 'crm', 'purchases', 'projects'],
        terminology: {
            customer: 'Client',
            product: 'Service Item',
            inventory: 'Supplies',
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

export function getIndustryConfig(industry: string): IndustryModuleConfig {
    return INDUSTRY_CONFIGS[industry] || INDUSTRY_CONFIGS[Industry.General];
}
