import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { TraceService } from '../services/trace.service';
import { randomUUID } from 'crypto';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private prisma: PrismaService,
    private readonly traceService: TraceService,
  ) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const url = req.url;
    // We only audit mutations (POST, PUT, PATCH, DELETE)
    // and exclude auth routes to avoid password logging
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    const isAuth = url.includes('/auth');
    const startTime = Date.now();
    const correlationId = this.traceService.getCorrelationId() || randomUUID();

    // Attach to request for downstream services
    req['correlationId'] = correlationId;

    if (!isMutation || isAuth) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async () => {
        const user = req.user;
        if (!user || !user.tenantId) return;

        try {
          const channel = user.channel || 'WEB';
          await (this.prisma as any).auditLog.create({
            data: {
              tenantId: req.user.tenantId,
              userId: req.user.id,
              action: `${req.method} ${req.url.split('?')[0]}`,
              resource: req.url.split('/')[2] || 'unknown',
              channel: channel,
              details: {
                payload: this.sanitizePayload(req.body),
                query: req.query,
                params: req.params,
                correlationId: req['correlationId'],
                ...(channel === 'MOBILE' ? { mobileIntent: 'MOBILE_INTENT_ONLY' } : {}),
              },
              ipAddress: req.ip,
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
