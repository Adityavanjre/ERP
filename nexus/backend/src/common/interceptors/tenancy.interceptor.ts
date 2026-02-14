import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenancyService } from '../services/tenancy.service';

@Injectable()
export class TenancyInterceptor implements NestInterceptor {
  constructor(private readonly tenancyService: TenancyService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId;

    if (tenantId) {
      return new Observable((observer) => {
        this.tenancyService.runWithTenant(tenantId, () => {
          next.handle().subscribe(observer);
        });
      });
    }

    return next.handle();
  }
}
