/**
 * Klypso Nexus Shared Contracts
 * This package houses the source-of-truth for cross-workspace interfaces.
 */

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

// 429 Mitigation Constants
export const RATE_LIMIT_MULTIPLIER = {
  OWNER: 10,
  ACCOUNTANT: 5,
  OPERATOR: 2,
};
