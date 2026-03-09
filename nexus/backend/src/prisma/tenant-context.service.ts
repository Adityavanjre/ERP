import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

@Injectable()
export class TenantContextService {
  private static readonly storage = new AsyncLocalStorage<{
    tenantId?: string;
    userId?: string;
    role?: string;
    userType?: string;
  }>();

  run(
    tenantId: string | undefined,
    userId: string | undefined,
    role: string | undefined,
    userType: string | undefined,
    next: () => any,
  ) {
    return TenantContextService.storage.run(
      { tenantId, userId, role, userType },
      next,
    );
  }

  getUserType(): string | undefined {
    return TenantContextService.storage.getStore()?.userType;
  }

  getTenantId(): string | undefined {
    const context = TenantContextService.storage.getStore();
    return context?.tenantId;
  }

  getSafeTenantId(): string {
    const context = TenantContextService.storage.getStore();
    if (!context?.tenantId) {
      throw new Error(
        'SECURITY_LEVEL_CRITICAL: Attempted database access without Tenant Context',
      );
    }
    return context.tenantId;
  }

  getUserId(): string | undefined {
    return TenantContextService.storage.getStore()?.userId;
  }

  getRole(): string | undefined {
    return TenantContextService.storage.getStore()?.role;
  }
}
