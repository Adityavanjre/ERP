import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@nexus/shared';

describe('Mobile Security Matrix (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const createToken = (
    role: Role,
    channel: 'WEB' | 'MOBILE',
    tenantId = 'test-tenant-id',
  ) => {
    return jwtService.sign({
      sub: 'test-user-id',
      email: 'test@example.com',
      role,
      channel,
      tenantId,
      type: 'tenant_scoped',
      isOnboarded: true,
    });
  };

  describe('Scenario 1: Role x Channel x Action Matrix', () => {
    it('Biller on WEB should be allowed to view stats (PermissionsGuard handled)', async () => {
      // Note: VIEW_SALES_STATS is for Owner/Manager.
      // This test confirms that standard permissions still work.
      const token = createToken(Role.Biller, 'WEB');
      await request(app.getHttpServer())
        .get('/sales/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.FORBIDDEN); // Biller shouldn't see stats even on web
    });

    it('Owner on WEB should be allowed to view stats', async () => {
      const token = createToken(Role.Owner, 'WEB');
      await request(app.getHttpServer())
        .get('/sales/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect((res) => {
          if (res.status !== 200 && res.status !== 404) {
            // 404 is acceptable if no data, but 403 is a failure here
            expect(res.status).not.toBe(HttpStatus.FORBIDDEN);
          }
        });
    });

    it('Owner on MOBILE should be allowed to view stats (Whitelisted)', async () => {
      const token = createToken(Role.Owner, 'MOBILE');
      await request(app.getHttpServer())
        .get('/sales/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect((res) => {
          expect(res.status).not.toBe(HttpStatus.FORBIDDEN);
        });
    });

    it('Biller on MOBILE should be BLOCKED from viewing stats (Whitelist Violation)', async () => {
      const token = createToken(Role.Biller, 'MOBILE');
      await request(app.getHttpServer())
        .get('/sales/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.FORBIDDEN)
        .expect((res) => {
          expect(res.body.message).toContain('Security Violation');
        });
    });
  });

  describe('Scenario 2: State Transition Safety', () => {
    it('MOBILE: Create Order as DRAFT should be ALLOWED', async () => {
      const token = createToken(Role.Biller, 'MOBILE');
      await request(app.getHttpServer())
        .post('/sales/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'Draft', customerId: 'any', items: [] })
        .expect((res) => {
          // We expect the guard to pass. 400/404 is fine (logic), 403 is failure.
          expect(res.status).not.toBe(HttpStatus.FORBIDDEN);
        });
    });

    it('MOBILE: Create Order as FINALIZED should be BLOCKED', async () => {
      const token = createToken(Role.Biller, 'MOBILE');
      await request(app.getHttpServer())
        .post('/sales/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'Finalized', customerId: 'any', items: [] })
        .expect(HttpStatus.FORBIDDEN)
        .expect((res) => {
          expect(res.body.message).toContain('forbidden on Mobile');
        });
    });

    it('WEB: Create Order as FINALIZED should be ALLOWED', async () => {
      const token = createToken(Role.Biller, 'WEB');
      await request(app.getHttpServer())
        .post('/sales/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'Finalized', customerId: 'any', items: [] })
        .expect((res) => {
          expect(res.status).not.toBe(HttpStatus.FORBIDDEN);
        });
    });
  });

  describe('Scenario 3: Block-by-Default (Unregistered Action)', () => {
    it('MOBILE: Any non-decorated action should be BLOCKED', async () => {
      const token = createToken(Role.Owner, 'MOBILE');
      // Assuming /users/profile or similar is not decorated with @MobileAction
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.FORBIDDEN)
        .expect((res) => {
          expect(res.body.message).toContain(
            'not whitelisted for Mobile access',
          );
        });
    });

    it('WEB: Non-decorated action should be ALLOWED', async () => {
      const token = createToken(Role.Owner, 'WEB');
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect((res) => {
          expect(res.status).not.toBe(HttpStatus.FORBIDDEN);
        });
    });
  });
});
