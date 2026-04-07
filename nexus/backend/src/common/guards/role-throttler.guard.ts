import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { RATE_LIMIT_MULTIPLIER } from '@nexus/shared';

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
    const {
      context,
      limit,
      ttl,
      throttler,
      blockDuration,
      getTracker,
      generateKey,
    } = requestProps;
    const request = context.switchToHttp().getRequest();
    const { user, url } = request;

    // REF-001: Granular Path Scoping for klypso.in (Main Domain)
    // Only apply rate limiting to API endpoints to prevent 429s on UI/Assets navigation
    const isApiRequest = url.includes('/api/v1') || url.includes('/portal/api/v1');
    const isStaticAsset = url.includes('/favicon.ico') || url.includes('/robots.txt') || url.includes('/sitemap.xml');
    
    // RED-001: Liveness probes must never be throttled to avoid deployment healthcheck failures
    const isHealthCheck = url.includes('/health/liveness');

    if (!isApiRequest || isStaticAsset || isHealthCheck) {
      return true; // Skip throttling for non-API routes or assets
    }

    let adjustedLimit = limit;

    if (user && user.role) {
      // Use string literals to prevent SSR 'Cannot read properties of undefined (reading Owner)' error
      if (user.role === 'Owner') {
        adjustedLimit = limit * RATE_LIMIT_MULTIPLIER.OWNER;
      } else if (user.role === 'CA') {
        adjustedLimit = limit * RATE_LIMIT_MULTIPLIER.ACCOUNTANT;
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
