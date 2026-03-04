import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * IdempotencyInterceptor — Prevents duplicate processing of the same request.
 * 
 * SEC-009: Uses DB-backed atomic locks (unique constraints) to prevent 
 * parallel racing during the initial processing window.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
    constructor(private prisma: PrismaService) { }

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const request = context.switchToHttp().getRequest();
        const idempotencyKey = request.headers['x-idempotency-key'];

        // Only apply to mutating requests (POST, PUT, PATCH, DELETE)
        if (!idempotencyKey || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
            return next.handle();
        }

        const tenantId = request.user?.tenantId || 'global';
        const now = new Date();

        try {
            // 1. Check for existing record
            const entry = await (this.prisma as any).idempotencyKey.findUnique({
                where: { tenantId_key: { tenantId, key: idempotencyKey } },
            });

            if (entry) {
                // If still processing, block.
                if (entry.status === 'PROCESSING' && entry.expiresAt > now) {
                    throw new ConflictException('Another request with the same idempotency key is currently being processed.');
                }

                // If completed and not expired (24h), return cached response
                if (entry.status === 'COMPLETED' && entry.expiresAt > now) {
                    return of(entry.response);
                }

                // If expired, or was stuck in PROCESSING beyond its expiry, we reset it.
            }

            // 2. Atomic Lock: Attempt to transition to PROCESSING
            // Only if doesn't exist OR is truly expired.
            // P2002 (Unique constraint) will handle the absolute race.
            if (entry && entry.status === 'COMPLETED' && entry.expiresAt > now) {
                return of(entry.response);
            }

            await (this.prisma as any).idempotencyKey.upsert({
                where: { tenantId_key: { tenantId, key: idempotencyKey } },
                update: {
                    status: 'PROCESSING',
                    expiresAt: new Date(Date.now() + 30000), // 30s lock for the active request
                },
                create: {
                    tenantId,
                    key: idempotencyKey,
                    status: 'PROCESSING',
                    expiresAt: new Date(Date.now() + 30000)
                }
            });

        } catch (error: any) {
            // P2002: Unique constraint failed (race condition)
            if (error.code === 'P2002') {
                throw new ConflictException('Conflict: Request is already being processed or completed.');
            }
            throw error;
        }

        return next.handle().pipe(
            tap({
                next: async (response) => {
                    // 3. Save result and mark as COMPLETED
                    await (this.prisma as any).idempotencyKey.update({
                        where: { tenantId_key: { tenantId, key: idempotencyKey } },
                        data: {
                            status: 'COMPLETED',
                            response: response || {},
                            expiresAt: new Date(Date.now() + 86400000) // 24h
                        }
                    });
                },
                error: async () => {
                    // 4. Release lock on error to allow retries
                    await (this.prisma as any).idempotencyKey.delete({
                        where: { tenantId_key: { tenantId, key: idempotencyKey } }
                    }).catch(() => { });
                }
            })
        );
    }
}
