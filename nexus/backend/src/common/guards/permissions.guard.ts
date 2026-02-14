import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { Permission, RolePermissions } from '../constants/permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      'permissions',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      throw new ForbiddenException('User context missing');
    }

    const userPermissions = (RolePermissions as any)[user.role] || [];
    const hasPermission = requiredPermissions.every((p) =>
      userPermissions.includes(p),
    );

    if (!hasPermission) {
      // 1. Log High Risk Escalation (Fire and Forget)
      this.prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id || user.userId,
          action: 'HIGH_RISK_ACCESS_VIOLATION',
          resource: context.getHandler().name,
          details: {
            required: requiredPermissions,
            userRole: user.role,
            path: context.switchToHttp().getRequest().url,
          } as any,
        },
      }).catch(e => console.error('Audit Log Failed in Guard', e));

      // 2. Logic to check for multiple violations (simplified) -> Founder Notification
      // In a real system, you'd trigger a WhatsApp/Email service here if count > 3

      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
