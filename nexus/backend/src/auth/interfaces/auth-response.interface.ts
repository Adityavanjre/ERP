import { Role } from '@prisma/client';
import { AccessChannel } from '@nexus/shared';

export interface AuthUserResponse {
  id: string;
  email: string;
  fullName: string | null;
  mfaEnabled: boolean;
  isSuperAdmin: boolean;
}

export interface TenantResponse {
  id: string;
  name: string;
  slug: string;
  role: Role;
  isOnboarded: boolean;
}

export interface AuthResponse {
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUserResponse;
  tenants?: TenantResponse[];
  tenant?: TenantResponse;
  requiresOnboarding?: boolean;
  requiresMfa?: boolean;
  requiresMfaSetup?: boolean;
  tempToken?: string;
  setupToken?: string;
  channel?: AccessChannel;
  recoveryCodes?: string[];
}
