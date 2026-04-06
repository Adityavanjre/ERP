import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';
import { Role } from '@prisma/client';

@Injectable()
export class RoleThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const user = req.user;
    // If authenticated, track by User ID + Tenant ID to ensure fair usage within a shared workspace
    // While preventing a single IP (corporate NAT) from exhausting the global pool.
    if (user && user.sub && user.tenantId) {
      return `user:${user.sub}:${user.tenantId}`;
    }
    // Fallback to IP for public endpoints (identity tokens use IP)
    return req.ip;
  }

  protected async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    const { context, limit, ttl, throttler, blockDuration, getTracker, generateKey } = requestProps;
    const { user } = context.switchToHttp().getRequest();

    let adjustedLimit = limit;

    if (user && user.role) {
      if (user.role === Role.Owner) {
        adjustedLimit = limit * 10; // Owners get 10x leeway for heavy exports/syncs
      } else if (user.role === Role.CA) {
        adjustedLimit = limit * 5; // Accountants get 5x leeway
      }
    }

    return super.handleRequest({
      context,
      limit: adjustedLimit,
      ttl,
      throttler,
      blockDuration,
      getTracker,
      generateKey,
    });
  }
}
