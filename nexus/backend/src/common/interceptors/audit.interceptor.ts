import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const url = req.url;
    // We only audit mutations (POST, PUT, PATCH, DELETE)
    // and exclude auth routes to avoid password logging
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    const isAuth = url.includes('/auth');

    if (!isMutation || isAuth) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async () => {
        const user = req.user;
        if (!user || !user.tenantId) return;

        try {
          await this.prisma.auditLog.create({
            data: {
              tenantId: user.tenantId,
              userId: user.userId,
              action: method,
              resource: url,
              ipAddress: req.ip || req.get('X-Forwarded-For') || 'unknown',
              details: {
                body: this.sanitizePayload(req.body),
                query: this.sanitizePayload(req.query),
                params: this.sanitizePayload(req.params),
              },
            },
          });
        } catch (error) {
          console.error('Audit Log failed:', error);
          // Non-blocking failure
        }
      }),
    );
  }

  private sanitizePayload(data: any): any {
    if (!data || typeof data !== 'object') return data;
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'otp'];
    const sanitized = Array.isArray(data) ? [...data] : { ...data };

    for (const key in sanitized) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[MASKED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizePayload(sanitized[key]);
      }
    }
    return sanitized;
  }
}
