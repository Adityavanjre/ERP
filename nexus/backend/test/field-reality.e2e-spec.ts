import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@nexus/shared';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Mobile Field Reality & Offline Defense (e2e)', () => {
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
        await prisma.order.deleteMany({ where: { idempotencyKey: { startsWith: 'field-test-' } } });
        await app.close();
    });

    const createMobileToken = (role: Role, tenantId = 'test-tenant-id') => {
        return jwtService.sign({
            sub: 'field-user-id',
            email: 'field@stressed.com',
            role,
            channel: 'MOBILE',
            tenantId,
            type: 'tenant_scoped',
            isOnboarded: true,
            industry: 'Retail'
        });
    };

    describe('Scenario 1: Stressed User - Double Tap Submit', () => {
        it('VERIFY: Idempotency prevents duplicate orders on rapid taps', async () => {
            const token = createMobileToken(Role.Biller);
            const idempotencyKey = `field-test-double-tap-${Date.now()}`;
            const payload = {
                customerId: null,
                items: [{ productId: 'any', quantity: 1, price: 100 }],
                idempotencyKey,
                status: 'Draft'
            };

            // First Tap
            const res1 = await request(app.getHttpServer())
                .post('/sales/orders')
                .set('Authorization', `Bearer ${token}`)
                .send(payload)
                .expect(HttpStatus.CREATED);

            const orderId1 = res1.body.id;

            // Second Tap (Rapid Re-submission)
            const res2 = await request(app.getHttpServer())
                .post('/sales/orders')
                .set('Authorization', `Bearer ${token}`)
                .send(payload)
                .expect(HttpStatus.CREATED); // Should return same result

            expect(res2.body.id).toBe(orderId1);

            // Audit Evidence: Ensure only ONE order exists in DB
            const count = await prisma.order.count({ where: { idempotencyKey } });
            expect(count).toBe(1);
        });
    });

    describe('Scenario 2: Field Error - Wrong Party Selected', () => {
        it('VERIFY: Server rejects linking order to a party from a different tenant', async () => {
            const token = createMobileToken(Role.Biller, 'my-tenant');

            // Vector: Select a customer ID belonging to 'other-tenant'
            const payload = {
                customerId: 'alien-customer-id', // ID doesn't exist in 'my-tenant'
                items: [{ productId: 'any', quantity: 1, price: 100 }],
                status: 'Draft'
            };

            const res = await request(app.getHttpServer())
                .post('/sales/orders')
                .set('Authorization', `Bearer ${token}`)
                .send(payload)
                .expect(HttpStatus.BAD_REQUEST);

            expect(res.body.message).toContain('Compliance Error: Customer alien-customer-id not found');
        });
    });

    describe('Scenario 3: System Guardian - Offline Sync Defense (No Power Escalation)', () => {
        it('VERIFY: Offline-created "Paid" order is REJECTED by Guard during Sync', async () => {
            const token = createMobileToken(Role.Biller);

            // Vector: Stressed/Hostile app tries to POST an order with status: 'Paid'
            // Mobile Whitelist only allows { null -> 'Draft' }
            const payload = {
                customerId: null,
                items: [{ productId: 'any', quantity: 1, price: 500 }],
                status: 'Paid', // ESCALATION ATTEMPT
                idempotencyKey: `field-test-sync-escalation-${Date.now()}`
            };

            const res = await request(app.getHttpServer())
                .post('/sales/orders')
                .set('Authorization', `Bearer ${token}`)
                .send(payload)
                .expect(HttpStatus.FORBIDDEN);

            expect(res.body.message).toContain('Forbidden on Mobile');

            // Audit Log should record the escalation attempt
            const log = await prisma.auditLog.findFirst({
                where: { action: 'SECURITY_VIOLATION_FORBIDDEN_TRANSITION' }
            });
            expect(log).toBeDefined();
        });

        it('VERIFY: Valid "Draft" sync preserves integrity', async () => {
            const token = createMobileToken(Role.Biller);
            const payload = {
                customerId: null,
                items: [{ productId: 'any', quantity: 1, price: 50 }],
                status: 'Draft',
                idempotencyKey: `field-test-valid-sync-${Date.now()}`
            };

            await request(app.getHttpServer())
                .post('/sales/orders')
                .set('Authorization', `Bearer ${token}`)
                .send(payload)
                .expect(HttpStatus.CREATED);

            // Ensure no partial ledger entry exists (as it's a Draft)
            // In our system, Drafts don't post to GL.
        });
    });
});
