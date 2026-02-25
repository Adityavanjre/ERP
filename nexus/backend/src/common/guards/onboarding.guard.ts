import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class OnboardingGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const allowUnboarded = this.reflector.getAllAndOverride<boolean>('allowUnboarded', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic || allowUnboarded) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check if user has a tenant-scoped token and if it's onboarded
    if (user && user.type === 'tenant_scoped' && user.isOnboarded === false) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Onboarding required',
        requiresOnboarding: true,
        tenantId: user.tenantId,
      });
    }

    return true;
  }
}
