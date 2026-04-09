import {
  Injectable,
  ExecutionContext,
  CallHandler,
  NestInterceptor,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Check for CacheTTL or other metadata if needed, but for now we follow the previous logic
    const cacheKey = this.trackBy(context);
    if (!cacheKey) {
      return next.handle();
    }

    const cachedResponse = await this.cacheManager.get(cacheKey);
    if (cachedResponse) {
      return of(cachedResponse);
    }

    return next.handle().pipe(
      tap(async (data) => {
        // Cache for 1 minute by default (or use reflector to get TTL)
        await this.cacheManager.set(cacheKey, data, 60000);
      }),
    );
  }

  protected trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest();
    // Cache by URL AND User Tenant (so tenants don't see each other's cache)
    return `${request.url}-${request.user?.tenantId}`;
  }
}
