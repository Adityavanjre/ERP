import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { Permission, RolePermissions } from '../constants/permissions';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { MODULE_KEY } from '../decorators/module.decorator';
import { Role } from '@nexus/shared';
import { LoggingService } from '../services/logging.service';

/**
 * Enforces the Mobile Safety Contract (Governance Regression Guard).
 * Ensures that AccessChannel restrictions are applied globally.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private logging: LoggingService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      'permissions',
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const { user } = request;
    // DEFENSE-IN-DEPTH: Treat missing channel as MOBILE (most restricted)
    const channel = user?.channel || 'MOBILE';

    if (!requiredPermissions) {
      // Fail-Secure: If no permissions defined and on mobile, block to prevent silent bypass
      if (channel === 'MOBILE') {
        const moduleName = this.reflector.getAllAndOverride<string>(MODULE_KEY, [
          context.getHandler(),
          context.getClass(),
        ]);

        const isCoreModule = ['auth', 'system', 'health'].includes(moduleName || '');
        if (!isCoreModule) {
          await this.logging.log({
            userId: user?.sub,
            tenantId: user?.tenantId,
            action: 'SECURITY_VIOLATION_NO_PERMISSIONS_ENROLLED',
            resource: context.getClass().name,
            channel: 'MOBILE',
            details: { handler: context.getHandler().name, reason: 'Endpoint lacks explicit permission enrollment for Mobile' },
            ipAddress: request.ip,
          });
          throw new ForbiddenException(
            'Security Violation: This endpoint is not explicitly enrolled with permissions for Mobile access. Please use the Web interface.'
          );
        }
      }
      return true;
    }

    if (!user || (!user.role && user.type !== 'admin')) {
      throw new ForbiddenException('User context missing');
    }

    const userPermissions = (RolePermissions as any)[user.role] || [];

    // Channel-Aware Gating (Rule 5: Prevents touch-based disasters)
    let hasPermission = requiredPermissions.every((p) =>
      userPermissions.includes(p),
    );

    // Special Case: Staff on Mobile cannot DELETE or LOCK_MONTH even if role has it usually
    if (channel === 'MOBILE' && user.role !== Role.Owner && user.role !== Role.Manager) {
      const restrictedOnMobile = [Permission.DELETE_INVOICE, Permission.LOCK_MONTH];
      if (requiredPermissions.some(p => restrictedOnMobile.includes(p))) {
        hasPermission = false;
      }
    }

    if (!hasPermission) {
      // Forensic Audit: Use the standardized LoggingService
      await this.logging.log({
        userId: user.sub,
        tenantId: user.tenantId,
        action: 'HIGH_RISK_ACCESS_VIOLATION',
        resource: context.getClass().name,
        channel: channel,
        details: {
          required: requiredPermissions,
          userRole: user.role,
          handler: context.getHandler().name,
          reason: 'Insufficient permissions for role/channel'
        },
        ipAddress: request.ip,
      });

      // 2. Logic to check for multiple violations (simplified) -> Founder Notification
      // In a real system, you'd trigger a WhatsApp/Email service here if count > 3

      const message = channel === 'MOBILE'
        ? `This action (${requiredPermissions.join(', ')}) is intentionally restricted on Mobile for safety and audit integrity. Please switch to the Web interface.`
        : `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`;

      throw new ForbiddenException(message);
    }

    return true;
  }
}
