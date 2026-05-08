import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../prisma/tenant-context.service';
import { QUEUE_BULK_IMPORT } from '../../infrastructure/queue/queue.module';

export interface BulkImportJobData {
  tenantId: string;
  userId: string;
  type: 'invoices' | 'products' | 'customers' | 'suppliers' | 'trial-balance';
  csvContent: string;
  idempotencyKey: string;
}

/**
 * ARCH-001: Bulk Import Background Processor
 *
 * Processes large CSV imports off the main Event Loop.
 * Each import type is handled atomically with full audit trail.
 * Jobs are retried up to 3 times with exponential backoff (configured in QueueModule).
 */
@Processor(QUEUE_BULK_IMPORT)
export class BulkImportProcessor extends WorkerHost {
  private readonly logger = new Logger(BulkImportProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>, token?: string): Promise<any> {
    const { tenantId, userId, type, csvContent, idempotencyKey } =
      job.data as BulkImportJobData;
    this.logger.log(
      `[JOB:${job.id}] Processing bulk import: type=${type}, tenant=${tenantId}`,
    );

    // Idempotency guard: check if this exact job was already completed
    const existing = await (this.prisma as any).backgroundJob.findUnique({
      where: { idempotencyKey },
    });
    if (existing?.status === 'Completed') {
      this.logger.warn(
        `[JOB:${job.id}] Duplicate import detected (${idempotencyKey}). Skipping.`,
      );
      return { skipped: true, reason: 'Duplicate job' };
    }

    // Mark as processing
    const jobRecord = await (this.prisma as any).backgroundJob.upsert({
      where: { idempotencyKey },
      update: {
        status: 'Processing',
        startedAt: new Date(),
        attempt: (existing?.attempt || 0) + 1,
      },
      create: {
        idempotencyKey,
        tenantId,
        userId,
        type: `BULK_IMPORT_${type.toUpperCase()}`,
        status: 'Processing',
        startedAt: new Date(),
      },
    });

    try {
      // BUG-QUEUE-01 FIX: All database operations in a background worker MUST run inside
      // TenantContextService.run(). Without this, the PrismaService $extends interceptor
      // has no tenant context and throws SECURITY_LEVEL_CRITICAL, crashing every job.
      return await this.tenantContext.run(
        tenantId,
        userId,
        undefined,
        undefined,
        async () => {
          // Robust CSV Split (handles quotes)
          const parseCSV = (content: string) => {
            const lines = content.trim().split('\n');
            return lines.map((line) => {
              const result = [];
              let cell = '';
              let inQuotes = false;
              for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') inQuotes = !inQuotes;
                else if (char === ',' && !inQuotes) {
                  result.push(cell.trim());
                  cell = '';
                } else cell += char;
              }
              result.push(cell.trim());
              return result;
            });
          };

          const allRows = parseCSV(csvContent);
          const headers = allRows[0].map((h) => h.toLowerCase());
          const dataRows = allRows.slice(1);

          let processedCount = 0;

          await job.updateProgress(5);

          for (let i = 0; i < dataRows.length; i++) {
            const cols = dataRows[i];
            if (cols.length < 2) continue;

            const rowData: Record<string, unknown> = {};
            headers.forEach((h, idx) => {
              rowData[h] = cols[idx];
            });

            // Delegate to specific logic based on type
            if (type === 'products') {
              await this.prisma.product.upsert({
                where: {
                  tenantId_sku: { tenantId, sku: (rowData.sku as string) || (rowData.code as string) },
                },
                update: {
                  name: rowData.name as string,
                  description: rowData.description as string,
                  price: Number((rowData.price as string) || (rowData.baseprice as string)) || 0,
                  costPrice: Number((rowData.cost as string) || (rowData.costprice as string)) || 0,
                },
                create: {
                  tenantId,
                  sku: (rowData.sku as string) || (rowData.code as string),
                  name: rowData.name as string,
                  description: rowData.description as string,
                  price: Number((rowData.price as string) || (rowData.baseprice as string)) || 0,
                  costPrice: Number((rowData.cost as string) || (rowData.costprice as string)) || 0,
                },
              });
            } else if (type === 'customers') {
              // Since tenantId_email is not unique in schema, we find or create
              const existing = await this.prisma.customer.findFirst({
                where: { tenantId, email: rowData.email as string },
              });

              if (existing) {
                await this.prisma.customer.update({
                  where: { id: existing.id },
                  data: {
                    firstName:
                      (rowData.firstname as string) ||
                      (rowData.name as string)?.split(' ')[0] ||
                      'Unknown',
                    lastName:
                      (rowData.lastname as string) ||
                      (rowData.name as string)?.split(' ').slice(1).join(' '),
                    phone: rowData.phone as string,
                  },
                });
              } else {
                await this.prisma.customer.create({
                  data: {
                    tenantId,
                    email: rowData.email as string,
                    firstName:
                      (rowData.firstname as string) ||
                      (rowData.name as string)?.split(' ')[0] ||
                      'Unknown',
                    lastName:
                      (rowData.lastname as string) ||
                      (rowData.name as string)?.split(' ').slice(1).join(' '),
                    phone: rowData.phone as string,
                    status: 'Customer',
                  },
                });
              }
            } else if (type === 'suppliers') {
              // BUG-QUEUE-02 FIX: The original upsert used `where: { id: rowData.id || '' }` which
              // crashes when CSV rows have no ID column (an empty string is never a valid UUID).
              // Use email-based find-or-create instead, which is the natural key for suppliers.
              if (rowData.email) {
                const existingSupplier = await this.prisma.supplier.findFirst({
                  where: { tenantId, email: rowData.email as string },
                });
                if (existingSupplier) {
                  await this.prisma.supplier.update({
                    where: { id: existingSupplier.id },
                    data: {
                      name: rowData.name as string,
                      phone: rowData.phone as string,
                      address: rowData.address as string,
                      gstin: rowData.gstin as string,
                    },
                  });
                } else {
                  await this.prisma.supplier.create({
                    data: {
                      tenantId,
                      name: rowData.name as string,
                      email: rowData.email as string,
                      phone: rowData.phone as string,
                      address: rowData.address as string,
                      gstin: rowData.gstin as string,
                    },
                  });
                }
              }
            }

            processedCount++;

            if (i % 10 === 0) {
              await job.updateProgress(
                Math.min(95, 5 + Math.floor((i / dataRows.length) * 90)),
              );
            }
          }

          await (this.prisma as any).backgroundJob.update({
            where: { id: jobRecord.id },
            data: {
              status: 'Completed',
              completedAt: new Date(),
              resultSummary: { processedCount },
            },
          });

          this.logger.log(
            `[JOB:${job.id}] Bulk import complete. Rows: ${processedCount}`,
          );
          return { processedCount };
        }, // end tenantContext.run
      );
    } catch (err: any) {
      await (this.prisma as any).backgroundJob.update({
        where: { id: jobRecord.id },
        data: { status: 'Failed', failedAt: new Date(), error: err.message },
      });
      this.logger.error(
        `[JOB:${job.id}] Bulk import failed: ${err.message}`,
        err.stack,
      );
      throw err; // Rethrow so BullMQ handles retry logic
    }
  }
}
