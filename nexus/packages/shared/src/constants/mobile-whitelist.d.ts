import { Role, Industry } from './index';
export interface MobileFeature {
    action: string;
    requiredRoles: Role[];
    requiredIndustries?: Industry[];
    allowedStatusTransitions?: {
        from: string | null;
        to: string;
    }[];
    description: string;
}
export declare const MOBILE_WHITELIST: Record<string, MobileFeature>;
