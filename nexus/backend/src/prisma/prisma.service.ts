import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
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
        if (typeof prop === 'string' && prop.startsWith('$')) {
          if (prop === '$transaction') {
            return async (...args: any[]) => {
              if (typeof args[0] === 'function') {
                const tenantId = this.tenantContext.getTenantId();
                return target.$transaction(async (tx: any) => {
                  if (tenantId) {
                    // SEC-001: Use parameterized $executeRaw to prevent SQL injection via tenantId
                    await tx.$executeRaw(Prisma.sql`SET LOCAL app.tenant_id = ${tenantId}`);
                  }

                  // SEC-001 FIX: Proxy the interactive transaction client to inject tenantId
                  const secureTx = new Proxy(tx, {
                    get: (txTarget: any, txProp: string | symbol) => {
                      if (typeof txProp === 'string' && !txProp.startsWith('$') && txTarget[txProp]) {
                        return new Proxy(txTarget[txProp], {
                          get: (modelTarget: any, op: string | symbol) => {
                            if (typeof op === 'string' && typeof modelTarget[op] === 'function') {
                              return async (queryArgs: any = {}) => {
                                const globalModels = ['Tenant', 'User', 'TenantUser', 'Plugin', 'App', 'AuditLog'];
                                if (!tenantId || globalModels.includes(txProp as string)) {
                                  return modelTarget[op](queryArgs);
                                }

                                const enforceIsolation = (obj: any) => {
                                  if (!obj) return;
                                  obj.tenantId = tenantId;
                                };

                                if (['create', 'createMany'].includes(op as string)) {
                                  if (Array.isArray(queryArgs.data)) {
                                    queryArgs.data.forEach((d: any) => enforceIsolation(d));
                                  } else {
                                    enforceIsolation(queryArgs.data);
                                  }
                                } else if (op === 'upsert') {
                                  enforceIsolation(queryArgs.create);
                                  enforceIsolation(queryArgs.update);
                                  enforceIsolation(queryArgs.where);
                                } else if (['update', 'updateMany'].includes(op as string)) {
                                  enforceIsolation(queryArgs.where);
                                  enforceIsolation(queryArgs.data);
                                } else {
                                  queryArgs.where = queryArgs.where || {};
                                  enforceIsolation(queryArgs.where);
                                  if (op === 'findUnique') op = 'findFirst';
                                }

                                return modelTarget[op](queryArgs);
                              };
                            }
                            return modelTarget[op];
                          }
                        });
                      }
                      return txTarget[txProp];
                    }
                  });

                  return args[0](secureTx);
                }, ...args.slice(1));
              }
              return target.$transaction(...args);
            };
          }
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
              // SEC-001: Use parameterized $executeRaw to prevent SQL injection via tenantId
              await tx.$executeRaw(Prisma.sql`SET LOCAL app.tenant_id = ${tenantId}`);

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
