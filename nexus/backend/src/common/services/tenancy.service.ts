import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

@Injectable()
export class TenancyService {
  private static readonly als = new AsyncLocalStorage<Map<string, string>>();

  setTenantId(tenantId: string) {
    const store = TenancyService.als.getStore();
    if (store) {
      store.set('tenantId', tenantId);
    }
  }

  getTenantId(): string | undefined {
    return TenancyService.als.getStore()?.get('tenantId');
  }

  runWithTenant(tenantId: string, fn: () => any) {
    const store = new Map<string, string>();
    store.set('tenantId', tenantId);
    return TenancyService.als.run(store, fn);
  }
}
