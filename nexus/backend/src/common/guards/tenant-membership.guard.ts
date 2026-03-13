import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';

@Injectable()
export class TenantMembershipGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 1. Skip for Unauthenticated/Public Routes
    // If JwtAuthGuard (which runs before this) determined the route is public,
    // req.user might be null. We let those pass through.
    if (!user) {
      return true;
    }

    // 2. Bypass for Identity Scoped Tokens
    // If no tenantId is in the token, it's an identity token (e.g. for /auth/tenants).
    // We allow it to pass this guard. RolesGuard will enforce that identity tokens
    // cannot hit tenant-scoped controllers unless tagged with @AllowIdentity().
    if (!user.tenantId) {
      return true;
    }

    // 3. Database-Level Membership & Subscription Verification (Rule B & Rule S)
    // Refetch the role and tenant status from DB to ensure unexpired JWTs don't
    // bypass immediate revocations/suspensions.
    // PERF-001: Cache membership for 30s to eliminate DB hop on every single click/interceptor.
    const cacheKey = `membership:${user.sub}:${user.tenantId}`;
    let membership = await this.cacheManager.get<any>(cacheKey);

    if (!membership) {
      membership = await this.prisma.tenantUser.findUnique({
        where: {
          userId_tenantId: {
            userId: user.sub,
            tenantId: user.tenantId,
          },
        },
        include: { tenant: true },
      });
      if (membership) {
        await this.cacheManager.set(cacheKey, membership, 30000);
      }
    }

    if (!membership) {
      throw new ForbiddenException({
        message: 'Access Denied: You are not a member of this workspace.',
        code: 'TENANT_MEMBERSHIP_REVOKED',
      });
    }

    const tenant = membership.tenant;

    // RULE-SUSPENSION (TEN-003): Block all actions if workspace is suspended.
    if (tenant.subscriptionStatus === 'Suspended') {
      throw new ForbiddenException({
        message: `Account Suspended: ${tenant.suspendReason || 'Administrative Review'}.`,
        code: 'TENANT_SUSPENDED',
      });
    }

    // RULE-READ-ONLY: Block mutations if account is in read-only mode.
    if (tenant.subscriptionStatus === 'ReadOnly' && request.method !== 'GET') {
      throw new ForbiddenException({
        message:
          'Account Restricted: This workspace is in Read-Only mode due to expiry.',
        code: 'TENANT_READ_ONLY',
      });
    }

    // 4. Stale Role Protection
    // Sync the role from DB into the request context.
    // If a user's role was changed in DB, the new role takes effect immediately.
    user.role = membership.role;
    user.tenantName = tenant.name;
    user.subscriptionStatus = tenant.subscriptionStatus;

    // 5. Attach Verified Metadata
    // Override the user object with DB-verified role to prevent JWT spoofing
    user.role = membership.role;
    user.tenant = membership.tenant;

    return true;
  }
}
