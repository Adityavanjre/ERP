import { Request } from 'express';
import { Role } from '@prisma/client';
import { AccessChannel } from '@nexus/shared';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  tenantId?: string;
  role?: Role;
  isSuperAdmin: boolean;
  isMfaVerified: boolean;
  type: 'identity' | 'tenant_scoped' | 'admin';
  customerId?: string | null;
  supplierId?: string | null;
  channel: AccessChannel;
  jti: string;
  tokenVersion: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
