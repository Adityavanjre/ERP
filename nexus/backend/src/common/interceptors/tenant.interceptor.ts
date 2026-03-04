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
  constructor(private readonly tenantContext: TenantContextService) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantId = user?.tenantId;
    const userId = user?.sub || user?.id; // Allow JWT sub or explicit user object ID
    const role = user?.role;

    if (tenantId) {
      return new Observable((observer) => {
        this.tenantContext.run(tenantId, userId, role, () => {
          next.handle().subscribe(observer);
        });
      });
    }

    return next.handle();
  }
}
