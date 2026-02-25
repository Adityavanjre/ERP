import { Industry, INDUSTRY_CONFIGS, Role } from '@nexus/shared';
import { useAuth } from '../auth/AuthContext';

export type ERPModule =
    | 'accounting'
    | 'inventory'
    | 'manufacturing'
    | 'hr'
    | 'crm'
    | 'purchases'
    | 'projects'
    | 'construction'
    | 'healthcare'
    | 'logistics'
    | 'nbfc';

export const useGovernance = () => {
    const { user } = useAuth();

    const isModuleAllowed = (moduleName: ERPModule): boolean => {
        // Fail-closed: If no user or industry, deny all
        if (!user || !user.industry) return false;

        const config = INDUSTRY_CONFIGS[user.industry];
        if (!config) return false;

        // 1. Check if module is enabled for the industry
        const isEnabled = config.enabledModules.includes(moduleName);
        if (!isEnabled) return false;

        // 2. Check if module is explicitly restricted for MOBILE channel
        const isMobileRestricted = config.mobileRestrictedModules?.includes(moduleName);
        if (isMobileRestricted) return false;

        // 3. Role-based overrides (Standard ERP Behavior)
        // Owners have access to everything that isn't mobile-restricted
        if (user.role === Role.Owner) return true;

        // Future: Add granular RolePermissions check here from @nexus/shared
        // For now, we follow industry config + mobile restrictions
        return true;
    };

    const getTerminology = (key: string): string => {
        if (!user || !user.industry) return key;
        const config = INDUSTRY_CONFIGS[user.industry];
        if (config?.terminology && config.terminology[key]) {
            return config.terminology[key];
        }
        return key;
    };

    return {
        isModuleAllowed,
        getTerminology,
        userRole: user?.role,
        userIndustry: user?.industry,
    };
};
