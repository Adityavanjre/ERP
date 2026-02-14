import {
  Injectable,
  ExecutionContext,
  CallHandler,
  NestInterceptor,
} from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';

@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
  trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest();
    // In NestJS CacheInterceptor, httpAdapterHost is available via this.httpAdapterHost
    // provided we extend the correct class.However, simplified version:

    if (request.method !== 'GET') {
      return undefined;
    }

    // Cache by URL AND User Tenant (so tenants don't see each other's cache)
    return `${request.url}-${request.user?.tenantId}`;
  }
}
