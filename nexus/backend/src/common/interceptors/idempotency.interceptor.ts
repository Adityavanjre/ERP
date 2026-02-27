import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    ConflictException,
    Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * IdempotencyInterceptor — Prevents duplicate processing of the same request.
 * 
 * Flow:
 * 1. Checks for 'x-idempotency-key' header.
 * 2. Scopes key by tenantId to prevent collisions.
 * 3. Returns cached response if key was already processed within the TTL (24h).
 * 4. Blocks concurrent duplicate requests while the first one is processing.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const request = context.switchToHttp().getRequest();
        const idempotencyKey = request.headers['x-idempotency-key'];

        // Only apply to mutating requests (POST, PUT, PATCH, DELETE)
        if (!idempotencyKey || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
            return next.handle();
        }

        const tenantId = request.user?.tenantId || 'global';
        const cacheKey = `idempotency:${tenantId}:${idempotencyKey}`;

        const cachedResponse = await this.cacheManager.get(cacheKey);

        if (cachedResponse) {
            if (cachedResponse === 'PROCESSING') {
                throw new ConflictException('Another request with the same idempotency key is currently being processed.');
            }
            // Return the previously cached response
            return of(cachedResponse);
        }

        // Set lock to prevent race conditions during processing
        await this.cacheManager.set(cacheKey, 'PROCESSING', 30000); // 30s lock

        return next.handle().pipe(
            tap(async (response) => {
                // Cache the successful response for 24 hours
                await this.cacheManager.set(cacheKey, response, 86400000);
            }),
        );
    }
}
