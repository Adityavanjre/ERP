import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';

@Injectable()
export class B2BGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Role check
    const isB2B = user.role === Role.Customer || user.role === Role.Supplier;
    if (!isB2B) {
      throw new ForbiddenException('B2B Access ONLY');
    }

    // Identity safety check: Ensure the user is actually linked to an entity
    if (user.role === Role.Customer && !user.customerId) {
        throw new ForbiddenException('Incomplete Customer Profile: No linked account');
    }
    if (user.role === Role.Supplier && !user.supplierId) {
        throw new ForbiddenException('Incomplete Supplier Profile: No linked account');
    }

    return true;
  }
}
