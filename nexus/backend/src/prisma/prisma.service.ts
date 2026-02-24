import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
  private _isolatedClient: any;

  constructor(private tenantContext: TenantContextService) {
    super();
    this._isolatedClient = this._createIsolatedClient();

    // The Structural Isolation Proxy
    // Intercepts model calls and redirects them to the extension client.
    return new Proxy(this, {
      get: (target: any, prop: string | symbol) => {
        // BLOCK RAW QUERIES: Prevent isolation escapes
        const rawMethods = ['$queryRaw', '$executeRaw', '$queryRawUnsafe', '$executeRawUnsafe'];
        if (typeof prop === 'string' && rawMethods.includes(prop)) {
          throw new Error(`SECURITY_LEVEL_CRITICAL: Raw database access is strictly forbidden in multi-tenant context.`);
        }

        // Properties starting with $ are internal Prisma methods ($connect, $transaction, etc.)
        if (typeof prop === 'string' && prop.startsWith('$')) {
          return target[prop];
        }

        // If it's a model-like property and the extended client has it, use the extended client
        if (prop in this._isolatedClient) {
          return this._isolatedClient[prop];
        }

        return target[prop];
      },
    });
  }

  private _createIsolatedClient() {
    const context = this.tenantContext;

    return (this as any).$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }: any) {
            const tenantId = context.getTenantId();
            const globalModels = ['Tenant', 'User', 'TenantUser', 'Plugin'];

            if (globalModels.includes(model)) {
              return query(args);
            }

            if (!tenantId) {
              throw new Error(
                `SECURITY_LEVEL_CRITICAL: ${operation} on ${model} blocked. Missing Tenant Context. Query cannot be scoped.`,
              );
            }

            const enforceIsolation = (obj: any) => {
              if (!obj) return;
              // Block cross-tenant access attempts
              if (obj.tenantId && obj.tenantId !== tenantId) {
                throw new Error(
                  `SECURITY_LEVEL_CRITICAL: Cross-tenant access detected on ${model}. Attempted: ${obj.tenantId}, Actual: ${tenantId}`,
                );
              }
              // Force tenantId injection
              obj.tenantId = tenantId;
            };

            // Handle different operation types
            if (['create', 'createMany'].includes(operation)) {
              if (Array.isArray(args.data)) {
                args.data.forEach((d: any) => enforceIsolation(d));
              } else {
                enforceIsolation(args.data);
              }
            } else if (operation === 'upsert') {
              enforceIsolation(args.create);
              enforceIsolation(args.update);
              enforceIsolation(args.where);
            } else if (['update', 'updateMany'].includes(operation)) {
              enforceIsolation(args.where);
              enforceIsolation(args.data);
            } else {
              // For all other operations (find, delete, aggregate, count, etc.)
              args.where = args.where || {};
              enforceIsolation(args.where);

              // Special handling for findUnique to allow tenant scoping (force findFirst)
              if (operation === 'findUnique') {
                return (this as any)[model].findFirst(args);
              }
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
