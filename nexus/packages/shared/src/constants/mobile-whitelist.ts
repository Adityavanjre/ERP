import { Role, Industry } from './index';

export interface MobileFeature {
    action: string;
    requiredRoles: Role[];
    requiredIndustries?: Industry[]; // Optional: if empty, all industries allowed
    allowedStatusTransitions?: {
        from: string | null;
        to: string;
    }[];
    description: string;
}

export const MOBILE_WHITELIST: Record<string, MobileFeature> = {
    'CREATE_ORDER': {
        action: 'CREATE_ORDER',
        requiredRoles: [Role.Owner, Role.Manager, Role.Biller, Role.Storekeeper, Role.Accountant],
        allowedStatusTransitions: [
            { from: null, to: 'Draft' }
        ],
        description: 'Create a new sales order as a Draft.'
    },
    'VIEW_ORDERS': {
        action: 'VIEW_ORDERS',
        requiredRoles: [Role.Owner, Role.Manager, Role.Biller, Role.Storekeeper, Role.Accountant],
        description: 'View list of sales orders. Restricted to recent items on mobile.'
    },
    'VIEW_SALES_STATS': {
        action: 'VIEW_SALES_STATS',
        requiredRoles: [Role.Owner, Role.Manager],
        description: 'View aggregate sales performance reports.'
    },
    'VIEW_PRODUCTS': {
        action: 'VIEW_PRODUCTS',
        requiredRoles: [Role.Owner, Role.Manager, Role.Biller, Role.Storekeeper, Role.Accountant],
        description: 'Browse product catalog and check stock levels.'
    },
    'VIEW_LEADS': {
        action: 'VIEW_LEADS',
        requiredRoles: [Role.Owner, Role.Manager, Role.Biller],
        description: 'Access CRM dashboard and lead lists.'
    },
    'CREATE_LEAD': {
        action: 'CREATE_LEAD',
        requiredRoles: [Role.Owner, Role.Manager, Role.Biller],
        allowedStatusTransitions: [
            { from: null, to: 'Draft' }
        ],
        description: 'Add new prospects to the CRM funnel as drafts.'
    },
    'APPROVE_ORDER': {
        action: 'APPROVE_ORDER',
        requiredRoles: [Role.Owner, Role.Manager],
        allowedStatusTransitions: [
            { from: 'Draft', to: 'Approved' }
        ],
        description: 'Authorize a sales order draft (Web-intent sync).'
    },
    'REJECT_ORDER': {
        action: 'REJECT_ORDER',
        requiredRoles: [Role.Owner, Role.Manager],
        allowedStatusTransitions: [
            { from: 'Draft', to: 'Rejected' },
            { from: 'Pending', to: 'Rejected' }
        ],
        description: 'Reject an unauthorized or invalid order draft.'
    },
    'APPROVE_WO': {
        action: 'APPROVE_WO',
        requiredRoles: [Role.Owner, Role.Manager],
        allowedStatusTransitions: [
            { from: 'Pending', to: 'Confirmed' },
            { from: 'Draft', to: 'Confirmed' }
        ],
        description: 'Authorize a job card (Work Order) for production.'
    },
    'REJECT_WO': {
        action: 'REJECT_WO',
        requiredRoles: [Role.Owner, Role.Manager],
        allowedStatusTransitions: [
            { from: 'Pending', to: 'Rejected' },
            { from: 'Draft', to: 'Rejected' }
        ],
        description: 'Reject a job card (Work Order) draft.'
    },
    'APPROVE_LEAVE': {
        action: 'APPROVE_LEAVE',
        requiredRoles: [Role.Owner, Role.Manager],
        allowedStatusTransitions: [
            { from: 'Pending', to: 'Approved' },
            { from: 'Pending', to: 'Rejected' }
        ],
        description: 'Review and approve/reject employee leave applications.'
    },
    'VIEW_LEAVES': {
        action: 'VIEW_LEAVES',
        requiredRoles: [Role.Owner, Role.Manager, Role.Biller, Role.Storekeeper, Role.Accountant],
        description: 'Check status of own or team leave requests.'
    },
    'SELECT_TENANT': {
        action: 'SELECT_TENANT',
        requiredRoles: [Role.Owner, Role.Manager, Role.Biller, Role.Storekeeper, Role.Accountant],
        description: 'Switch between managed company contexts.'
    },
    'VIEW_TENANTS': {
        action: 'VIEW_TENANTS',
        requiredRoles: [Role.Owner, Role.Manager, Role.Biller, Role.Storekeeper, Role.Accountant],
        description: 'List accessible companies.'
    },
    'ONBOARDING': {
        action: 'ONBOARDING',
        requiredRoles: [Role.Owner, Role.Manager, Role.Biller, Role.Storekeeper, Role.Accountant],
        description: 'Complete mandatory profile and company setup.'
    },
    'VIEW_PROFILE': {
        action: 'VIEW_PROFILE',
        requiredRoles: [Role.Owner, Role.Manager, Role.Biller, Role.Storekeeper, Role.Accountant],
        description: 'View personal account and session details.'
    },
    'CREATE_WORKSPACE': {
        action: 'CREATE_WORKSPACE',
        requiredRoles: [Role.Owner, Role.Manager, Role.Biller, Role.Storekeeper, Role.Accountant],
        description: 'Create a new business workspace.'
    }
};
