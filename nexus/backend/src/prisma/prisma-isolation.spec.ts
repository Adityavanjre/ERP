// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { TenantContextService } from './tenant-context.service';

describe('Prisma Tenant Isolation', () => {
  let prisma: PrismaService;
  let context: TenantContextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService, TenantContextService],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    context = module.get<TenantContextService>(TenantContextService);
  });

  describe('Security Enforcement', () => {
    it('should throw error if tenant context is missing', async () => {
      jest.spyOn(context, 'getTenantId').mockReturnValue(undefined);

      await expect(prisma.product.findMany()).rejects.toThrow(
        /SECURITY_LEVEL_CRITICAL.*Blocked.*Missing Tenant Context/i,
      );
    });

    it('should throw error on cross-tenant access attempt (malicious override)', async () => {
      jest.spyOn(context, 'getTenantId').mockReturnValue('tenant-1');

      await expect(
        prisma.product.findMany({
          where: { tenantId: 'tenant-2' } as any,
        }),
      ).rejects.toThrow(
        /SECURITY_LEVEL_CRITICAL.*Cross-tenant access detected/i,
      );
    });

    it('should prevent writing with wrong tenantId in data', async () => {
      jest.spyOn(context, 'getTenantId').mockReturnValue('tenant-1');

      await expect(
        (prisma as any).product.create({
          data: { name: 'New Product', tenantId: 'wrong-tenant' },
        }),
      ).rejects.toThrow(
        /SECURITY_LEVEL_CRITICAL.*Cross-tenant access detected/i,
      );
    });

    it('should prevent updating tenantId in update operation', async () => {
      jest.spyOn(context, 'getTenantId').mockReturnValue('tenant-1');

      await expect(
        (prisma as any).product.update({
          where: { id: 'prod-1' } as any,
          data: { tenantId: 'wrong-tenant' },
        }),
      ).rejects.toThrow(
        /SECURITY_LEVEL_CRITICAL.*Cross-tenant access detected/i,
      );
    });

    it('should throw error on aggregate if tenant context is missing', async () => {
      jest.spyOn(context, 'getTenantId').mockReturnValue(undefined);

      await expect(
        (prisma as any).product.aggregate({
          _count: { id: true },
        }),
      ).rejects.toThrow(/SECURITY_LEVEL_CRITICAL.*Missing Tenant Context/i);
    });
  });
});
