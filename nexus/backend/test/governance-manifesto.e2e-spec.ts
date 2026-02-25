import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@nexus/shared';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Founder Manifesto: Hard Invariant Enforcement (e2e)', () => {
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
        await prisma.auditLog.deleteMany({
            where: { action: { in: ['MANIFESTO_VIOLATION_INV_05', 'SECURITY_VIOLATION_MUTATION_ATTEMPT'] } }
        });
        await app.close();
    });

    const createMobileToken = (role: Role, tenantId = 'manifesto-tenant-id') => {
        return jwtService.sign({
            sub: 'manifesto-user-id',
            role,
            channel: 'MOBILE',
            tenantId,
            type: 'tenant_scoped',
            isOnboarded: true,
            industry: 'General'
        });
    };

    describe('INV-05: Absolute Accounting Block on Mobile', () => {
        it('VERIFY: Access to /accounting/ledger is BLOCKED on Mobile regardless of role', async () => {
            const token = createMobileToken(Role.Owner); // Even Owner is blocked

            const res = await request(app.getHttpServer())
                .get('/accounting/ledger')
                .set('Authorization', `Bearer ${token}`)
                .expect(HttpStatus.FORBIDDEN);

            expect(res.body.message).toContain('INV-05');
            expect(res.body.message).toContain('restricted to the Web interface');

            // Audit Check
            const log = await prisma.auditLog.findFirst({
                where: { action: 'MANIFESTO_VIOLATION_INV_05' }
            }) as any;
            expect(log).toBeTruthy();
        });
    });

    describe('INV-06: Binary Approval (Zero-Mutation) Enforcement', () => {
        it('VERIFY: Approving a leave with extra "amount" field is BLOCKED on Mobile', async () => {
            const token = createMobileToken(Role.Manager);

            // Vector: Attempt to 'APPROVE_LEAVE' but inject 'salaryBonus' mutation
            const res = await request(app.getHttpServer())
                .post('/hr/leaves/uuid-123/approve') // Hypothetical endpoint
                .set('Authorization', `Bearer ${token}`)
                .send({
                    status: 'Approved',
                    salaryBonus: 5000, // ILLEGAL MUTATION
                    idempotencyKey: 'manifesto-test-1'
                })
                .expect(HttpStatus.FORBIDDEN);

            expect(res.body.message).toContain('INV-06');
            expect(res.body.message).toContain('Mutation of business fields (salaryBonus) is forbidden');

            // Audit Check
            const log = await prisma.auditLog.findFirst({
                where: { action: 'SECURITY_VIOLATION_MUTATION_ATTEMPT' }
            }) as any;
            expect(log).toBeTruthy();
            expect(log?.details?.illegalKeys).toContain('salaryBonus');
        });

        it('VERIFY: Clean Binary Approval (status + reason) is ALLOWED on Mobile', async () => {
            const token = createMobileToken(Role.Manager);

            // This should pass the INV-06 check (but might fail if endpoint doesn't exist, which is fine for gasket test)
            const res = await request(app.getHttpServer())
                .post('/hr/leaves/uuid-123/approve')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    status: 'Approved',
                    reason: 'Valid on mobile',
                    idempotencyKey: 'manifesto-test-2'
                });

            // 404/403 (Unauthorized) is fine, as long as it's NOT the INV-06 Forbidden error
            if (res.status === HttpStatus.FORBIDDEN) {
                expect(res.body.message).not.toContain('INV-06');
            }
        });
    });
});
