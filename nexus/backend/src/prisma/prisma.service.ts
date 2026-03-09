import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
  private _isolatedClient: any;
  private _modelCache = new Map<string, boolean>();

  constructor(private tenantContext: TenantContextService) {
    // PERF-003: Measure concurrency caps logic preventing pool exhaustion gateway crashes
    super({
      log: ['query', 'info', 'warn', 'error'],
    });

    this._isolatedClient = this._createIsolatedClient();

    // The Structural Isolation Proxy
    // Intercepts model calls and redirects them to the extension client for tenant isolation.
    return new Proxy(this, {
      get: (target: any, prop: string | symbol) => {
        if (typeof prop === 'string' && prop.startsWith('$')) {
          if (prop === '$transaction') {
            return async (...args: any[]) => {
              if (typeof args[0] === 'function') {
                const tenantId = this.tenantContext.getTenantId();
                const userType = this.tenantContext.getUserType();

                return target.$transaction(
                  async (tx: any) => {
                    // Proxy the interactive transaction client to inject tenantId into
                    // all sub-queries performed within an explicit $transaction block.
                    const secureTx = new Proxy(tx, {
                      get: (txTarget: any, txProp: string | symbol) => {
                        if (
                          typeof txProp === 'string' &&
                          !txProp.startsWith('$') &&
                          txTarget[txProp]
                        ) {
                          return new Proxy(txTarget[txProp], {
                            get: (modelTarget: any, op: string | symbol) => {
                              if (
                                typeof op === 'string' &&
                                typeof modelTarget[op] === 'function'
                              ) {
                                return async (queryArgs: any = {}) => {
                                  const globalModels = [
                                    'Tenant',
                                    'User',
                                    'TenantUser',
                                    'Plugin',
                                    'App',
                                    'AuditLog',
                                    'RevokedToken',
                                    'WebhookSecretRotation',
                                    'WebhookDeadLetter',
                                    'ModelDefinition',
                                    'FieldDefinition',
                                    'AccessRight',
                                    'WorkflowDefinition',
                                    'WorkflowNode',
                                    'WorkflowTransition',
                                    'IdempotencyKey',
                                    'BackgroundJob',
                                  ];

                                  const isGlobal = globalModels
                                    .map((m) => m.toLowerCase())
                                    .includes(txProp.toLowerCase());

                                  // SECURITY (SYS-010): Admin & System Bypass.
                                  // Infrastructure administrators and System init flows (Registration) can bypass scoped checks.
                                  const isSystemAction = tenantId === 'SYSTEM_INIT';

                                  if (
                                    (!tenantId && userType !== 'admin' && !isGlobal) ||
                                    isGlobal ||
                                    isSystemAction
                                  ) {
                                    if (isGlobal || userType === 'admin' || isSystemAction) return modelTarget[op](queryArgs);
                                  }

                                  const enforceIsolation = (obj: any) => {
                                    if (!obj || !tenantId || isSystemAction) return;
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
                                      if (this.hasCreatedById(txProp)) {
                                        queryArgs.where.createdById = userId;
                                      }
                                    }
                                  } else if (['update', 'updateMany', 'delete', 'deleteMany'].includes(op as string)) {
                                    queryArgs.where = queryArgs.where || {};
                                    enforceIsolation(queryArgs.where);
                                    if (['update', 'updateMany'].includes(op as string)) {
                                      enforceIsolation(queryArgs.data);
                                    }

                                    const userId = this.tenantContext.getUserId();
                                    const userRole = this.tenantContext.getRole();
                                    if (userId && !['Owner', 'Manager', 'CA'].includes(userRole || '')) {
                                      if (this.hasCreatedById(txProp)) {
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
                            },
                          });
                        }
                        return txTarget[txProp];
                      },
                    });

                    return args[0](secureTx);
                  },
                  ...args.slice(1),
                );
              }
              return target.$transaction(...args);
            };
          }
          return target[prop];
        }

        if (prop in this._isolatedClient) {
          return this._isolatedClient[prop];
        }

        return target[prop];
      },
    });
  }

  private hasCreatedById(modelName: string): boolean {
    if (this._modelCache.has(modelName)) {
      return this._modelCache.get(modelName)!;
    }
    const dmmfModel = Prisma.dmmf.datamodel.models.find(
      (m: any) => m.name.toLowerCase() === modelName.toLowerCase(),
    );
    const hasField = !!dmmfModel?.fields.some((f: any) => f.name === 'createdById');
    this._modelCache.set(modelName, hasField);
    return hasField;
  }

  async onModuleInit() {
    let retries = 5;
    while (retries > 0) {
      try {
        await (this as any).$connect();
        break;
      } catch (err) {
        retries--;
        console.error(`[PrismaService] Connection failed. Retries left: ${retries}`);
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
          $allOperations: async ({ model, operation, args, query }: any) => {
            const tenantId = context.getTenantId();
            const userType = context.getUserType();

            const globalModels = [
              'Tenant', 'User', 'TenantUser', 'Plugin', 'App', 'AuditLog',
              'RevokedToken', 'WebhookSecretRotation', 'WebhookDeadLetter',
              'ModelDefinition', 'FieldDefinition', 'AccessRight',
              'WorkflowDefinition', 'WorkflowNode', 'WorkflowTransition',
              'IdempotencyKey', 'BackgroundJob'
            ];

            const isGlobal = globalModels.map(m => m.toLowerCase()).includes(model.toLowerCase());

            if (isGlobal || userType === 'admin') {
              return query(args);
            }

            if (!tenantId) {
              throw new Error(`SECURITY_LEVEL_CRITICAL: ${operation} on ${model} blocked. Missing Tenant Context.`);
            }

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
            } else if (['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
              args.where = args.where || {};
              enforceIsolation(args.where);
              if (['update', 'updateMany'].includes(operation)) {
                enforceIsolation(args.data);
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
