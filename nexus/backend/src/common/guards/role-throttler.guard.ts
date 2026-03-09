import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
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
    requestProps: any, // ThrottlerRequest in v6
  ): Promise<boolean> {
    const { context, limit, ttl } = requestProps;
    const { user } = context.switchToHttp().getRequest();

    let adjustedLimit = limit;

    if (user && user.role) {
      if (user.role === Role.Owner) {
        adjustedLimit = limit * 2; // Owners get more leeway
      } else if (user.role === Role.CA) {
        adjustedLimit = limit * 1.5;
      }
    }

    return super.handleRequest({ ...requestProps, limit: adjustedLimit });
  }
}
