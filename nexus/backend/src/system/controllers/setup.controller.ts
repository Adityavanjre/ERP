
import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { Role, TenantType, PlanType } from '@prisma/client';

@Controller('system/setup')
export class SetupController {
  constructor(private prisma: PrismaService) {}

  @Get('restore-admin')
  async restoreAdmin() {
    const email = 'admin@klypso.agency';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Ensure Tenant (Match Master Seeder!)
    const tenant = await this.prisma.tenant.upsert({
      where: { slug: 'premium-woodcraft' },
      update: {},
      create: {
        name: 'Premium Woodcraft Industries',
        slug: 'premium-woodcraft',
        type: TenantType.Manufacturing,
        plan: PlanType.Enterprise
      }
    });

    // 2. Ensure User
    const user = await this.prisma.user.upsert({
      where: { email },
      update: { passwordHash: hashedPassword, isSuperAdmin: true },
      create: {
        email,
        passwordHash: hashedPassword,
        fullName: 'System Administrator',
        isSuperAdmin: true
      }
    });

    // 3. Ensure Membership
    await this.prisma.tenantUser.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
      update: { role: Role.Owner },
      create: {
        userId: user.id,
        tenantId: tenant.id,
        role: Role.Owner
      }
    });

    return {
      status: 'SUCCESS',
      message: 'Admin account restored.',
      credentials: { email, password },
      loginUrl: 'https://klypso-frontend.onrender.com/login'
    };
  }
}
