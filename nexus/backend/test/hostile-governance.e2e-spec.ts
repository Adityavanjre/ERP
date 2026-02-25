import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@nexus/shared';

describe('Hostile Governance Testing (e2e)', () => {
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

    const createToken = (role: Role, channel: 'WEB' | 'MOBILE' | 'API', tenantId = 'test-tenant-id') => {
        return jwtService.sign({
            sub: 'hostile-user-id',
            email: 'hacker@hostile.com',
            role,
            channel,
            tenantId,
            type: 'tenant_scoped',
            isOnboarded: true,
        });
    };

    describe('💣 ATTACK 1: Status Forgery', () => {
        it('should REJECT mobile attempt to create a finalized order directly', async () => {
            const token = createToken(Role.Owner, 'MOBILE');
            await request(app.getHttpServer())
                .post('/sales/orders')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    status: 'Approved', // HOSTILE: Trying to bypass Draft
                    customerId: 'any',
                    items: [{ productId: 'p1', quantity: 10, price: 100 }]
                })
                .expect(HttpStatus.FORBIDDEN)
                .expect(res => {
                    expect(res.body.message).toContain('forbidden on Mobile');
                });
        });

        it('should REJECT mobile attempt to bypass status transition by omitting it', async () => {
            const token = createToken(Role.Owner, 'MOBILE');
            await request(app.getHttpServer())
                .post('/sales/orders')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    // HOSTILE: Omitting status to see if it defaults to backend logic without guard check
                    customerId: 'any',
                    items: []
                })
                .expect(HttpStatus.FORBIDDEN)
                .expect(res => {
                    expect(res.body.message).toContain('status field is required');
                });
        });
    });

    describe('💣 ATTACK 2: Business Mutation during Binary Approval', () => {
        it('should REJECT mobile attempt to change order total during approval', async () => {
            const token = createToken(Role.Owner, 'MOBILE');
            await request(app.getHttpServer())
                .post('/sales/orders/order-123/approve')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    status: 'Approved',
                    total: 0.01, // HOSTILE: Attempting to change price during approval
                    reason: 'Price adjustment exploit'
                })
                .expect(HttpStatus.FORBIDDEN)
                .expect(res => {
                    expect(res.body.message).toContain('[INV-06] Mobile approvals are binary-only');
                    expect(res.body.message).toContain('Mutation of business fields (total) is forbidden');
                });
        });
    });

    describe('💣 ATTACK 3: Unwhitelisted Module Escalation', () => {
        it('should REJECT mobile attempt to access heavy accounting endpoints', async () => {
            const token = createToken(Role.Accountant, 'MOBILE');
            await request(app.getHttpServer())
                .post('/accounting/lock-period') // This endpoint should NOT be whitelisted for mobile
                .set('Authorization', `Bearer ${token}`)
                .send({ period: '2026-02' })
                .expect(HttpStatus.FORBIDDEN)
                .expect(res => {
                    expect(res.body.message).toContain('not whitelisted for Mobile access');
                });
        });

        it('should REJECT mobile attempt to perform stock adjustment (FREEZE TEST)', async () => {
            const token = createToken(Role.Storekeeper, 'MOBILE');
            await request(app.getHttpServer())
                .post('/inventory/movements')
                .set('Authorization', `Bearer ${token}`)
                .send({ productId: 'p1', quantity: 1000, type: 'IN' })
                .expect(HttpStatus.FORBIDDEN)
                .expect(res => {
                    expect(res.body.message).toContain('not whitelisted for Mobile access');
                });
        });
    });

    describe('💣 ATTACK 4: Identity Channel Anchoring Bypass', () => {
        it('should REJECT token with forged channel if secret is mismatched (Standard JWT safety)', async () => {
            // This tests that our reliance on the 'channel' claim is safe because the token is signed.
            const forgedToken = jwtService.sign({
                sub: 'hacker',
                channel: 'WEB', // Pretending to be web to bypass mobile guards
                role: Role.Owner
            }, { secret: 'WRONG_SECRET' });

            await request(app.getHttpServer())
                .get('/accounting/reports')
                .set('Authorization', `Bearer ${forgedToken}`)
                .expect(HttpStatus.UNAUTHORIZED);
        });
    });

    describe('💣 ATTACK 5: Job Card (Work Order) Governance Bypass', () => {
        it('should REJECT mobile Job Card approval without idempotencyKey', async () => {
            const token = createToken(Role.Owner, 'MOBILE');
            await request(app.getHttpServer())
                .post('/manufacturing/work-orders/wo-123/approve')
                .set('Authorization', `Bearer ${token}`)
                .send({ status: 'Confirmed' }) // HOSTILE: Missing idempotencyKey
                .expect(HttpStatus.FORBIDDEN)
                .expect(res => {
                    expect(res.body.message).toContain('idempotencyKey is required');
                });
        });

        it('should REJECT mobile Job Card approval with illegal business mutation', async () => {
            const token = createToken(Role.Owner, 'MOBILE');
            await request(app.getHttpServer())
                .post('/manufacturing/work-orders/wo-123/approve')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    status: 'Confirmed',
                    idempotencyKey: 'k-999',
                    quantity: 999999 // HOSTILE: Attempting to change production qty during approval
                })
                .expect(HttpStatus.FORBIDDEN)
                .expect(res => {
                    expect(res.body.message).toContain('[INV-06] Mobile approvals are binary-only');
                    expect(res.body.message).toContain('Mutation of business fields (quantity) is forbidden');
                });
        });

        it('should ALLOW valid mobile Job Card approval (Binary-Only check)', async () => {
            const token = createToken(Role.Owner, 'MOBILE');
            // We expect 404/200 but NOT 403. 404 is fine as wo-123 doesn't exist.
            await request(app.getHttpServer())
                .post('/manufacturing/work-orders/wo-123/approve')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    status: 'Confirmed',
                    idempotencyKey: 'k-valid',
                    reason: 'Authenticated field user'
                })
                .expect(res => {
                    expect(res.status).not.toBe(HttpStatus.FORBIDDEN);
                });
        });
    });
});
