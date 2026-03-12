import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContextService } from '../../prisma/tenant-context.service';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly tenantContext: TenantContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantId = user?.tenantId;
    const userId = user?.sub || user?.id; // Allow JWT sub or explicit user object ID
    const role = user?.role;
    const userType = user?.type;
    const isRegistrationFlow =
      !tenantId && !userId && request.url.includes('/auth/register');

    if (tenantId || isRegistrationFlow) {
      return new Observable((observer) => {
        this.tenantContext.run(
          tenantId || 'SYSTEM_INIT',
          userId,
          role,
          userType,
          () => {
            next.handle().subscribe(observer);
          },
        );
      });
    }

    // Always run in context even if no tenantId to carry userType for Admin bypass
    return new Observable((observer) => {
      this.tenantContext.run(undefined, userId, role, userType, () => {
        next.handle().subscribe(observer);
      });
    });
  }
}
