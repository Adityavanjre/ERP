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
    private logging: LoggingService,
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

    // 🔴 DEEP FIX: Global Token Rejection
    // Identity or Admin tokens (no tenantId/role) MUST NOT access generic endpoints
    // unless explicitly tagged with @AllowIdentity()
    if (user.type === 'identity' || user.type === 'admin' || user.type === 'mfa_setup_pending') {
      const allowIdentity = this.reflector.getAllAndOverride<boolean>(
        ALLOW_IDENTITY_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (!allowIdentity) {
        this.logging
          .log({
            userId: user.sub,
            action: 'SECURITY_VIOLATION_GLOBAL_TOKEN_USE',
            resource: context.getClass().name,
            details: {
              handler: context.getHandler().name,
              type: user.type,
              reason:
                'Global token attempted to access tenant-scoped or protected route',
            },
            ipAddress: request.ip,
          })
          .catch((err) =>
            console.error('Failed to log security violation', err),
          );

        throw new ForbiddenException(
          'A tenant-scoped token is required for this operation. Please select a company.',
        );
      }

      // 🟢 Admin Override: If it's an 'admin' token and user is SuperAdmin,
      // they effectively have the highest role (Owner) for global routes.
      if (user.type === 'admin' && user.isSuperAdmin) {
        user.role = Role.Owner; // Set virtual role for downstream guards/controllers
        return true;
      }

      // If identity is allowed and no specific roles are required, let it pass
      if (!requiredRoles) {
        return true;
      }
    }

    // If no roles are strictly required for a tenant-token:
    if (!requiredRoles) {
      // SECURITY (AUTH-004): Strict Fail-Closed for Mutations.
      // Every POST/PUT/PATCH/DELETE *must* explicitly declare who is allowed to run it.
      if (request.method !== 'GET' && request.method !== 'OPTIONS') {
        const highPrivilegeRoles = [Role.Owner, Role.Manager];
        const isHighPrivilege = highPrivilegeRoles.includes(user.role);

        this.logging
          .log({
            userId: user.sub,
            action: isHighPrivilege ? 'SECURITY_WARNING_MISSING_RBAC' : 'SECURITY_VIOLATION_MISSING_RBAC',
            resource: context.getClass().name,
            details: {
              handler: context.getHandler().name,
              reason: 'Mutation endpoint is missing @Roles() decorator',
              status: isHighPrivilege ? 'ALLOWED_BY_FALLBACK' : 'BLOCKED',
              userRole: user.role
            },
            ipAddress: request.ip,
          })
          .catch((err) =>
            console.error('Failed to log security violation', err),
          );

        if (!isHighPrivilege) {
          throw new ForbiddenException(
            `Strict RBAC Enforcement: This mutation (${request.method} ${request.url}) is missing an explicit @Roles() assignment. ` +
            `Access has been blocked for non-admin role: ${user.role}. Please contact support or use a high-privilege account.`,
          );
        }
      }
      return true; // GET requests default to any valid tenant member.
    }

    // Assuming the user object is attached by the JWT guard
    // and has a `role` property (TenantUser role) if it is a tenant_scoped token.
    if (!requiredRoles.some((role) => user.role === role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
