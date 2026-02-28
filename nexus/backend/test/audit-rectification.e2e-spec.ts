import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { Role, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Audit Rectification Verification (e2e)', () => {
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
        await app.close();
    });

    const createToken = (userId: string, tenantId?: string, role = Role.Owner, isSuperAdmin = false) => {
        return jwtService.sign({
            sub: userId,
            tenantId,
            role,
            isSuperAdmin,
            type: tenantId ? 'tenant_scoped' : 'identity',
        });
    };

    describe('TEN-003: Tenant Suspension Hardening', () => {
        it('should REJECT selectTenant for a suspended workspace', async () => {
            const tenant = await prisma.tenant.create({
                data: {
                    name: 'Suspended Audit Corp',
                    slug: `suspended-${Date.now()}`,
                    subscriptionStatus: SubscriptionStatus.Suspended,
                    type: 'Retail',
                }
            });

            const user = await prisma.user.findFirst();
            await prisma.tenantUser.create({
                data: {
                    userId: user!.id,
                    tenantId: tenant.id,
                    role: Role.Owner
                }
            });

            const token = createToken(user!.id, tenant.id);

            await request(app.getHttpServer())
                .post('/auth/select-tenant')
                .set('Authorization', `Bearer ${token}`)
                .send({ tenantId: tenant.id })
                .expect(HttpStatus.GONE);
        });
    });

    describe('TEN-001: IDOR & Cross-Tenant Isolation', () => {
        it('should REJECT accessing an invoice from another tenant', async () => {
            // 1. Create Tenant A + Invoice A
            const tenantA = await prisma.tenant.create({ data: { name: 'Tenant A', slug: `a-${Date.now()}` } });
            const customerA = await prisma.customer.create({ data: { tenantId: tenantA.id, firstName: 'C-A', state: 'Delhi' } });
            const invoiceA = await prisma.invoice.create({
                data: {
                    tenantId: tenantA.id,
                    customerId: customerA.id,
                    invoiceNumber: 'INV-A-001',
                    totalAmount: 100,
                    issueDate: new Date(),
                    dueDate: new Date(),
                }
            });

            // 2. Create Tenant B + User B
            const tenantB = await prisma.tenant.create({ data: { name: 'Tenant B', slug: `b-${Date.now()}` } });
            const userB = await prisma.user.create({ data: { email: `user-b-${Date.now()}@test.com`, isSuperAdmin: false } });
            const tokenB = createToken(userB.id, tenantB.id);

            // 3. Attempt to access Invoice A with Token B
            await request(app.getHttpServer())
                .get(`/accounting/invoices/${invoiceA.id}`)
                .set('Authorization', `Bearer ${tokenB}`)
                .expect(HttpStatus.NOT_FOUND); // Should be 404 because findFirst with tenantId filter fails
        });

        it('should REJECT FounderDashboard access for non-superadmins', async () => {
            const user = await prisma.user.create({ data: { email: `normie-${Date.now()}@test.com`, isSuperAdmin: false } });
            const token = createToken(user.id);

            await request(app.getHttpServer())
                .get('/system/founder-dashboard')
                .set('Authorization', `Bearer ${token}`)
                .expect(HttpStatus.FORBIDDEN);
        });

        it('should ALLOW FounderDashboard access for superadmins', async () => {
            const admin = await prisma.user.create({ data: { email: `admin-${Date.now()}@test.com`, isSuperAdmin: true } });
            const token = createToken(admin.id, undefined, undefined, true);

            await request(app.getHttpServer())
                .get('/system/founder-dashboard')
                .set('Authorization', `Bearer ${token}`)
                .expect(HttpStatus.OK);
        });
    });

    describe('Collaboration: Delete Comment', () => {
        it('should REJECT deleting a comment from another tenant', async () => {
            const tenantA = await prisma.tenant.create({ data: { name: 'T-A', slug: `ta-${Date.now()}` } });
            const commentA = await prisma.comment.create({
                data: {
                    tenantId: tenantA.id,
                    userId: (await prisma.user.findFirst())?.id || '',
                    content: 'Comment A',
                    resourceType: 'Product',
                    resourceId: 'PID-1',
                }
            });

            const tenantB = await prisma.tenant.create({ data: { name: 'T-B', slug: `tb-${Date.now()}` } });
            const tokenB = createToken((await prisma.user.findFirst())?.id || '', tenantB.id);

            // Note: In real app, there's a CollaborationController. 
            // We'll rely on the service logic being tested through the app if controller is standard.
            // Search revealed CollaborationController exists.
            await request(app.getHttpServer())
                .delete(`/collaboration/comments/${commentA.id}`)
                .set('Authorization', `Bearer ${tokenB}`)
                .expect(HttpStatus.NOT_FOUND); 
        });
    });
});
