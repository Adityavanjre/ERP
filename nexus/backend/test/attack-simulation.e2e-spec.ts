import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@nexus/shared';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Hostile Security Tester: Mobile API Attack Simulation (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    // Cleanup audit logs created during test
    await prisma.auditLog.deleteMany({
      where: { action: { startsWith: 'SECURITY_VIOLATION' } },
    });
    await app.close();
  });

  const createMobileToken = (role: Role, tenantId = 'test-tenant-id') => {
    return jwtService.sign({
      sub: 'attacker-id',
      email: 'hostile@tester.com',
      role,
      channel: 'MOBILE',
      tenantId,
      type: 'tenant_scoped',
      isOnboarded: true,
      industry: 'Manufacturing',
    });
  };

  describe('Vector 1: Direct Module Bypass (Unauthorized Module Access)', () => {
    it('ATTACK: Attempt to access Restricted Module (Accounting) via Mobile Token', async () => {
      const token = createMobileToken(Role.Owner);

      // Vector: Hit /accounting/ledger which is restricted on Mobile for Manufacturing
      const res = await request(app.getHttpServer())
        .get('/accounting/ledger')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.FORBIDDEN);

      expect(res.body.message).toContain('restricted on Mobile');

      // AUDIT EVIDENCE: Check if violation was logged
      const log = (await prisma.auditLog.findFirst({
        where: {
          action: 'CHANNEL_RESTRICTION_VIOLATION',
          userId: 'attacker-id',
        },
      })) as any;
      expect(log).toBeTruthy();
      expect(log?.channel).toBe('MOBILE');
    });
  });

  describe('Vector 2: Shadow State Transition (Forbidden Status Injection)', () => {
    it('ATTACK: Force "Finalized" status on Order creation from Mobile', async () => {
      const token = createMobileToken(Role.Biller);

      // Vector: POST /sales/orders with status: 'Finalized' (Forbidden on Mobile)
      const res = await request(app.getHttpServer())
        .post('/sales/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'Finalized', customerId: 'any', items: [] })
        .expect(HttpStatus.FORBIDDEN);

      expect(res.body.message).toContain('forbidden on Mobile');

      // AUDIT EVIDENCE: Check if transition violation was logged
      const log = (await prisma.auditLog.findFirst({
        where: {
          action: 'SECURITY_VIOLATION_FORBIDDEN_TRANSITION',
          userId: 'attacker-id',
        },
      })) as any;
      expect(log).toBeTruthy();
      expect(log?.details).toMatchObject({ targetStatus: 'Finalized' });
    });

    it('ATTACK: Omit "status" to bypass transition rules', async () => {
      const token = createMobileToken(Role.Biller);

      // Vector: POST /sales/orders without status. Rule E requires status for safety.
      const res = await request(app.getHttpServer())
        .post('/sales/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ customerId: 'any', items: [] })
        .expect(HttpStatus.FORBIDDEN);

      expect(res.body.message).toContain('field is required');

      // AUDIT EVIDENCE
      const log = (await prisma.auditLog.findFirst({
        where: {
          action: 'SECURITY_VIOLATION_MISSING_STATUS',
          userId: 'attacker-id',
        },
      })) as any;
      expect(log).toBeTruthy();
    });
  });

  describe('Vector 3: Channel Spoofing Mitigation (Unwhitelisted Action Access)', () => {
    it('ATTACK: Hit unwhitelisted business action (Purchases) via Mobile Token', async () => {
      const token = createMobileToken(Role.Owner);

      // Vector: Hit /purchases/stats (NOT decorated with @MobileAction)
      const res = await request(app.getHttpServer())
        .get('/purchases/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.FORBIDDEN);

      expect(res.body.message).toContain('not whitelisted for Mobile access');

      // AUDIT EVIDENCE
      const log = (await prisma.auditLog.findFirst({
        where: {
          action: 'SECURITY_VIOLATION_UNWHITELISTED_ACTION',
          userId: 'attacker-id',
        },
      })) as any;
      expect(log).toBeTruthy();
    });
  });

  describe('Vector 4: Identity Deadlock Probe', () => {
    it('RECOVERY CHECK: Identity tokens MUST pass for core infrastructure (SELECT_TENANT)', async () => {
      const identityToken = jwtService.sign({
        sub: 'new-user-id',
        type: 'identity',
        channel: 'MOBILE',
      });

      // This should PASS the ModuleGuard and MobileWhitelistGuard (bypass applied)
      const res = await request(app.getHttpServer())
        .post('/auth/select-tenant')
        .set('Authorization', `Bearer ${identityToken}`)
        .send({ tenantId: 'any' })
        .expect((res) => {
          // It might fail in service (tenant not found), but 403 means GASKET FAILURE
          expect(res.status).not.toBe(HttpStatus.FORBIDDEN);
        });
    });
  });
});
