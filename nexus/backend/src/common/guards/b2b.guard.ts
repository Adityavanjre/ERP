import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * B2BGuard — Phase 0 Hardened
 *
 * Previously this guard trusted customerId/supplierId directly from the JWT
 * payload without database re-verification. That allowed a forged or stale
 * token to access another party's records.
 *
 * Now: the claim is verified against the live DB record before proceeding.
 */
@Injectable()
export class B2BGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Role check — only Customer and Supplier roles may access B2B portal
    const isB2B = user.role === Role.Customer || user.role === Role.Supplier;
    if (!isB2B) {
      throw new ForbiddenException('B2B Access ONLY');
    }

    if (user.role === Role.Customer) {
      if (!user.customerId) {
        throw new ForbiddenException(
          'Incomplete Customer Profile: No linked account',
        );
      }
      // DB RE-VERIFICATION: confirm the customerId in the JWT actually belongs
      // to the authenticated user within their tenant.
      const verified = await this.prisma.customer.findFirst({
        where: {
          id: user.customerId,
          tenantId: user.tenantId,
        },
        select: { id: true },
      });
      if (!verified) {
        throw new ForbiddenException(
          'B2B Access Denied: Customer claim could not be verified',
        );
      }
    }

    if (user.role === Role.Supplier) {
      if (!user.supplierId) {
        throw new ForbiddenException(
          'Incomplete Supplier Profile: No linked account',
        );
      }
      // DB RE-VERIFICATION: confirm the supplierId in the JWT actually belongs
      // to the authenticated user within their tenant.
      const verified = await this.prisma.supplier.findFirst({
        where: {
          id: user.supplierId,
          tenantId: user.tenantId,
        },
        select: { id: true },
      });
      if (!verified) {
        throw new ForbiddenException(
          'B2B Access Denied: Supplier claim could not be verified',
        );
      }
    }

    return true;
  }
}
