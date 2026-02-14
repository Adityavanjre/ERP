import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private _isolatedClient: any;

  constructor(private tenantContext: TenantContextService) {
    super();
    this._isolatedClient = this._createIsolatedClient();

    // The Structural Isolation Proxy
    // Intercepts model calls and redirects them to the extension client.
    return new Proxy(this, {
      get: (target: any, prop: string | symbol) => {
        // If the property exists on PrismaService (like $connect, onModuleInit), use it
        if (prop in target) return target[prop];

        // Otherwise, redirect to the extended client which has the isolation logic
        return this._isolatedClient[prop];
      },
    });
  }

  private _createIsolatedClient() {
    const context = this.tenantContext; // Capture for use inside extension

    return (this as any).$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }: any) {
            const tenantId = context.getTenantId();
            const globalModels = ['Tenant', 'User', 'TenantUser', 'Plugin'];

            if (globalModels.includes(model)) return query(args);

            if (tenantId) {
              if (['create', 'createMany'].includes(operation)) {
                args.data = Array.isArray(args.data)
                  ? args.data.map((d: any) => ({ ...d, tenantId }))
                  : { ...args.data, tenantId };
              } else if (operation === 'upsert') {
                args.create = { ...args.create, tenantId };
                args.update = { ...args.update, tenantId };
                args.where = { ...args.where, tenantId };
              } else {
                args.where = { ...args.where, tenantId };
              }
            } else {
              // FAIL-CLOSE: Block ALL access if no tenantId found, unless it's a global model.
              // This prevents potential leaks in public/developer-error routes.
              throw new Error(
                `SECURITY_LEVEL_CRITICAL: ${operation} on ${model} blocked. No Tenant Context.`,
              );
            }

            return query(args);
          },
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
