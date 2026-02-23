import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantMembershipGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 1. Authentication Check
    if (!user || !user.sub) {
      throw new UnauthorizedException('Authentication required');
    }

    // 2. Global Identity Check (e.g., for select-tenant or profile)
    // If no tenantId is provided in JWT, it's an identity token.
    // Scoped endpoints MUST have a tenantId.
    if (!user.tenantId) {
      // If the endpoint is scoped, this guard should fail.
      // We will assume scoped endpoints are the ones using this guard.
      throw new ForbiddenException('Tenant context required. Please select a company.');
    }

    // 3. Database-Level Membership Verification (Rule B)
    // This prevents stale/tampered JWTs from accessing Tenants.
    const membership = await this.prisma.tenantUser.findUnique({
      where: {
        userId_tenantId: {
          userId: user.sub,
          tenantId: user.tenantId,
        },
      },
      include: { tenant: true },
    });

    if (!membership) {
      throw new ForbiddenException('Access Denied: You are not a member of this tenant.');
    }

    // 4. Attach Verified Metadata
    // Override the user object with DB-verified role to prevent JWT spoofing
    user.role = membership.role;
    user.tenant = membership.tenant;

    return true;
  }
}
