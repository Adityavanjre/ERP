import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeviceTrustGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const deviceId = req.headers['x-device-id'] as string;
    
    // If no deviceId is provided (e.g. from the web app), allow request
    if (!deviceId || !req.user || !req.user.tenantId) {
      return true;
    }

    const device = await this.prisma.device.findUnique({
      where: {
        tenantId_deviceId: {
          tenantId: req.user.tenantId,
          deviceId
        }
      }
    });

    if (device && !device.isTrusted) {
      throw new ForbiddenException('Device is pending admin approval. Please contact your workspace administrator to authorize this device.');
    }

    return true;
  }
}
