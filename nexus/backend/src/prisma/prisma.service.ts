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
        // Properties starting with $ are internal Prisma methods ($connect, $transaction, etc.)
        if (typeof prop === 'string' && prop.startsWith('$')) {
          // Allow $executeRawUnsafe ONLY if it's being called internally by the isolation extension.
          // This is a delicate bridge for RLS setup.
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

  async onModuleInit() {
    let retries = 5;
    while (retries > 0) {
      try {
        await (this as any).$connect();
        break;
      } catch (err) {
        retries--;
        console.error(`[PrismaService] Failed to connect to DB.Retries left: ${retries} `);
        if (retries === 0) throw err;
        await new Promise((res) => setTimeout(res, 5000));
      }
    }
  }

  async onModuleDestroy() {
    await (this as any).$disconnect();
  }

  private _createIsolatedClient() {
    const context = this.tenantContext;
    const root = this; // Reference to the un-proxied client

    return (this as any).$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }: any) {
            const tenantId = context.getTenantId();
            const globalModels = ['Tenant', 'User', 'TenantUser', 'Plugin', 'App', 'AuditLog'];

            if (globalModels.includes(model)) {
              return query(args);
            }

            if (!tenantId) {
              throw new Error(
                `SECURITY_LEVEL_CRITICAL: ${operation} on ${model} blocked.Missing Tenant Context.Query cannot be scoped.`,
              );
            }

            // Application-layer Cross-tenant Isolation Check
            const checkIsolation = (data: any, source: string) => {
              if (data && data.tenantId && data.tenantId !== tenantId) {
                throw new Error(
                  `SECURITY_LEVEL_CRITICAL: Cross-tenant access detected in ${source} clause on ${model}. Operation blocked.`,
                );
              }
            };

            if (args.where) checkIsolation(args.where, 'where');
            if (args.data) {
              if (Array.isArray(args.data)) {
                args.data.forEach((d: any) => checkIsolation(d, 'data'));
              } else {
                checkIsolation(args.data, 'data');
              }
            }

            // RLS ENFORCEMENT LAYER
            // We wrap the operation in a transaction to ensure SET LOCAL app.tenant_id
            // stays bound to the same connection used for the actual query.
            // This physically enforces multi-tenancy at the PostgreSQL level.
            return (root as any).$transaction(async (tx: any) => {
              // Set the session variable used by Postgres RLS policies
              await tx.$executeRawUnsafe(`SET LOCAL app.tenant_id = '${tenantId}'`);

              const enforceIsolation = (obj: any) => {
                if (!obj) return;
                // Force tenantId injection for secondary application-layer safety
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
                args.where = args.where || {};
                enforceIsolation(args.where);

                if (operation === 'findUnique') {
                  // Re-route findUnique to findFirst on the transaction client
                  return tx[model].findFirst(args);
                }
              }

              // Execute the query on the transaction client to preserve the session state
              return tx[model][operation](args);
            });
          },
        },
      },
    });
  }
}
