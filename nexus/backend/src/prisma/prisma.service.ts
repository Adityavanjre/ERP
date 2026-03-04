import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
  private _isolatedClient: any;

  constructor(private tenantContext: TenantContextService) {
    // PERF-003: Measure concurrency caps logic preventing pool exhaustion gateway crashes
    super({
      log: ['query', 'info', 'warn', 'error'],
    });
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
                  // NOTE: SET LOCAL removed — PgBouncer transaction pooling mode
                  // does not support SET LOCAL across pooled connections (causes P2010).
                  // Application-layer tenantId injection via secureTx proxy is used instead.

                  // Proxy the interactive transaction client to inject tenantId into
                  // all sub-queries performed within an explicit $transaction block.
                  const secureTx = new Proxy(tx, {
                    get: (txTarget: any, txProp: string | symbol) => {
                      if (typeof txProp === 'string' && !txProp.startsWith('$') && txTarget[txProp]) {
                        return new Proxy(txTarget[txProp], {
                          get: (modelTarget: any, op: string | symbol) => {
                            if (typeof op === 'string' && typeof modelTarget[op] === 'function') {
                              return async (queryArgs: any = {}) => {
                                const globalModels = ['Tenant', 'User', 'TenantUser', 'Plugin', 'App', 'AuditLog'];

                                // SEC-004: Audit Log Immutability Enforcement (Transaction Layer)
                                if (txProp === 'AuditLog' && ['update', 'updateMany', 'delete', 'deleteMany', 'upsert'].includes(op as string)) {
                                  throw new Error(`SECURITY_LEVEL_CRITICAL: ${op as string} on AuditLog is strictly prohibited. Audit logs are immutable.`);
                                }

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

                                  const userId = this.tenantContext.getUserId();
                                  const userRole = this.tenantContext.getRole();
                                  if (userId && !['Owner', 'Manager', 'CA'].includes(userRole || '')) {
                                    const dmmfModel = Prisma.dmmf.datamodel.models.find((m: any) => m.name === txProp);
                                    if (dmmfModel?.fields.some((f: any) => f.name === 'createdById')) {
                                      queryArgs.where.createdById = userId;
                                    }
                                  }
                                } else if (['update', 'updateMany', 'delete', 'deleteMany'].includes(op as string)) {
                                  queryArgs.where = queryArgs.where || {};
                                  enforceIsolation(queryArgs.where);
                                  if (['update', 'updateMany'].includes(op as string)) {
                                    enforceIsolation(queryArgs.data);
                                  }

                                  // AUTH-001: Sub-Resource Authorization (Row-Level Security via createdById) restrict mutations
                                  const userId = this.tenantContext.getUserId();
                                  const userRole = this.tenantContext.getRole();
                                  if (userId && !['Owner', 'Manager', 'CA'].includes(userRole || '')) {
                                    const dmmfModel = Prisma.dmmf.datamodel.models.find((m: any) => m.name === txProp);
                                    if (dmmfModel?.fields.some((f: any) => f.name === 'createdById')) {
                                      queryArgs.where.createdById = userId;
                                    }
                                  }
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

    return (this as any).$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }: any) {
            const tenantId = context.getTenantId();
            // These models are global (cross-tenant by design) — skip isolation
            const globalModels = ['Tenant', 'User', 'TenantUser', 'Plugin', 'App', 'AuditLog'];

            // SEC-004: Audit Log Immutability Enforcement (Middleware Layer)
            if (model === 'AuditLog' && ['update', 'updateMany', 'delete', 'deleteMany', 'upsert'].includes(operation)) {
              throw new Error(`SECURITY_LEVEL_CRITICAL: ${operation} on AuditLog is strictly prohibited. Audit logs are immutable.`);
            }

            if (globalModels.includes(model)) {
              return query(args);
            }

            if (!tenantId) {
              throw new Error(
                `SECURITY_LEVEL_CRITICAL: ${operation} on ${model} blocked. Missing Tenant Context. Query cannot be scoped.`,
              );
            }

            // Cross-tenant isolation check — reject any query that explicitly
            // specifies a different tenantId (prevents accidental data leakage).
            const checkIsolation = (data: any, source: string) => {
              if (data && data.tenantId && data.tenantId !== tenantId) {
                throw new Error(
                  `SECURITY_LEVEL_CRITICAL: Cross-tenant access detected in ${source} on ${model}. Operation blocked.`,
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

            // Application-layer tenant isolation — inject tenantId into every query.
            // NOTE: SET LOCAL was removed because it fails with P2010 on Supabase
            // PgBouncer transaction pooling mode. App-layer injection is the primary
            // enforcement; DB-level RLS policies provide defense-in-depth.
            const enforceIsolation = (obj: any) => {
              if (!obj) return;
              obj.tenantId = tenantId;
            };

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

              const userId = context.getUserId();
              const userRole = context.getRole();
              if (userId && !['Owner', 'Manager', 'CA'].includes(userRole || '')) {
                const dmmfModel = Prisma.dmmf.datamodel.models.find((m: any) => m.name === model);
                if (dmmfModel?.fields.some((f: any) => f.name === 'createdById')) {
                  args.where.createdById = userId;
                }
              }
            } else if (['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
              args.where = args.where || {};
              enforceIsolation(args.where);
              if (['update', 'updateMany'].includes(operation)) {
                enforceIsolation(args.data);
              }

              // AUTH-001: Sub-Resource Authorization (Row-Level Security via createdById) restrict mutations
              const userId = context.getUserId();
              const userRole = context.getRole();
              if (userId && !['Owner', 'Manager', 'CA'].includes(userRole || '')) {
                const dmmfModel = Prisma.dmmf.datamodel.models.find((m: any) => m.name === model);
                if (dmmfModel?.fields.some((f: any) => f.name === 'createdById')) {
                  args.where.createdById = userId;
                }
              }
            } else {
              args.where = args.where || {};
              enforceIsolation(args.where);
            }

            return query(args);
          },
        },
      },
    });
  }
}
