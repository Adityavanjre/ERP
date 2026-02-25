import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Identity Integrity: Channel Spoofing Defense (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let jwtService: JwtService;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        prisma = moduleFixture.get<PrismaService>(PrismaService);
        jwtService = moduleFixture.get<JwtService>(JwtService);
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('FIX-01: Server-Owned Channel Anchoring', () => {
        it('VERIFY: channel field in Login payload is COMPLETELY IGNORED', async () => {
            // Attempt spoof: Login via /mobile but claim channel=WEB
            const res = await request(app.getHttpServer())
                .post('/auth/login/mobile')
                .send({
                    email: 'owner@example.com',
                    password: 'password123',
                    channel: 'WEB' // ATTEMPTED SPOOF
                })
                .expect(HttpStatus.OK);

            const token = res.body.accessToken;
            const decoded = jwtService.decode(token) as any;

            // EVIDENCE: Token must be anchored to MOBILE despite payload
            expect(decoded.channel).toBe('MOBILE');
            expect(decoded.channel).not.toBe('WEB');
        });

        it('VERIFY: /login/web correctly anchors to WEB', async () => {
            const res = await request(app.getHttpServer())
                .post('/auth/login/web')
                .send({
                    email: 'owner@example.com',
                    password: 'password123'
                })
                .expect(HttpStatus.OK);

            const decoded = jwtService.decode(res.body.accessToken) as any;
            expect(decoded.channel).toBe('WEB');
        });

        it('VERIFY: Legacy token without channel is REJECTED (Fail-Closed)', async () => {
            // Create a token missing the 'channel' claim
            const legacyToken = jwtService.sign({
                sub: 'user-uuid',
                type: 'identity'
                // channel missing
            });

            // Attempt to access any guarded route (even public-facing ones like select-tenant)
            await request(app.getHttpServer())
                .post('/auth/select-tenant')
                .set('Authorization', `Bearer ${legacyToken}`)
                .send({ tenantId: 'tenant-uuid' })
                .expect(HttpStatus.FORBIDDEN);
        });
    });
});
