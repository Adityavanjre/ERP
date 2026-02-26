import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_IDENTITY_KEY } from '../decorators/allow-identity.decorator';
import { LoggingService } from '../services/logging.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private logging: LoggingService
  ) { }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const { user } = request;

    if (!user) {
      throw new ForbiddenException('User context missing');
    }

    // 🔴 DEEP FIX: Global Identity Token Rejection
    // Identity tokens (no tenantId/role) MUST NOT access generic endpoints
    // unless explicitly tagged with @AllowIdentity()
    if (user.type === 'identity') {
      const allowIdentity = this.reflector.getAllAndOverride<boolean>(ALLOW_IDENTITY_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (!allowIdentity) {
        this.logging.log({
          userId: user.sub,
          action: 'SECURITY_VIOLATION_IDENTITY_TOKEN_USE',
          resource: context.getClass().name,
          details: { handler: context.getHandler().name, reason: 'Identity token attempted to access tenant-scoped or protected route' },
          ipAddress: request.ip,
        }).catch(err => console.error('Failed to log security violation', err));

        throw new ForbiddenException('A tenant-scoped token is required for this operation. Please select a company.');
      }

      // If identity is allowed and no specific roles are required, let it pass
      if (!requiredRoles) {
        return true;
      }
    }

    // If no roles are strictly required for a tenant-token, they can pass.
    if (!requiredRoles) {
      return true;
    }

    // Assuming the user object is attached by the JWT guard
    // and has a `role` property (TenantUser role) if it is a tenant_scoped token.
    if (!requiredRoles.some((role) => user.role === role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
