import { MobileWhitelistGuard } from './mobile-whitelist.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LoggingService } from '../services/logging.service';

describe('MobileWhitelistGuard - Kill Switch (MOB-009)', () => {
    let guard: MobileWhitelistGuard;
    let reflector: Reflector;
    let logging: jest.Mocked<Partial<LoggingService>>;

    beforeEach(() => {
        reflector = new Reflector();
        logging = { log: jest.fn() } as any;
        guard = new MobileWhitelistGuard(reflector, logging as any);
    });

    afterEach(() => {
        delete process.env.MOBILE_WRITE_ENABLED;
        jest.clearAllMocks();
    });

    const mockContext = (method: string, channel: string): ExecutionContext => {
        return {
            getHandler: () => ({ name: 'testHandler' }),
            getClass: () => ({ name: 'TestController' }),
            switchToHttp: () => ({
                getRequest: () => ({
                    method,
                    user: { channel, sub: 'user1', tenantId: 'tenant1', role: 'Owner' },
                    body: { status: 'APPROVED' },
                    ip: '127.0.0.1'
                })
            })
        } as any;
    };

    it('should block ALL mobile WRITE operations when MOBILE_WRITE_ENABLED is explicitly false', async () => {
        // ACTIVATE KILL SWITCH
        process.env.MOBILE_WRITE_ENABLED = 'false';

        // Setup mock to simulate a non-public endpoint
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false); // isPublic = false

        const context = mockContext('POST', 'MOBILE');

        // Verify it throws the EXACT emergency restriction error
        await expect(guard.canActivate(context)).rejects.toThrow(
            'Emergency Restriction: Mobile write operations are currently disabled by the system administrator.'
        );

        // Verify it logs the Kill Switch telemetry
        expect(logging.log).toHaveBeenCalledWith(expect.objectContaining({
            action: 'SECURITY_KILL_SWITCH_ACTIVE',
            channel: 'MOBILE',
        }));
    });

    it('should allow mobile WRITE operations to proceed to next checks when MOBILE_WRITE_ENABLED is true', async () => {
        // DEACTIVATE KILL SWITCH
        process.env.MOBILE_WRITE_ENABLED = 'true';

        jest.spyOn(reflector, 'getAllAndOverride')
            .mockReturnValueOnce(false) // isPublic
            .mockReturnValueOnce('APPROVE_INVOICE'); // MOBILE_ACTION_KEY

        const context = mockContext('POST', 'MOBILE');

        try {
            await guard.canActivate(context);
        } catch (e: any) {
            // It might fail for missing configuration, missing idempotency key etc, but NOT the Kill Switch exception.
            expect(e.message).not.toContain('Emergency Restriction: Mobile write operations');
        }

        // Ensure Kill Switch log is NOT emitted
        expect(logging.log).not.toHaveBeenCalledWith(expect.objectContaining({
            action: 'SECURITY_KILL_SWITCH_ACTIVE'
        }));
    });

    it('should allow mobile READ operations even when MOBILE_WRITE_ENABLED is false', async () => {
        // ACTIVATE KILL SWITCH
        process.env.MOBILE_WRITE_ENABLED = 'false';

        jest.spyOn(reflector, 'getAllAndOverride')
            .mockReturnValueOnce(false) // isPublic
            .mockReturnValueOnce('VIEW_INVOICE'); // MOBILE_ACTION_KEY

        const context = mockContext('GET', 'MOBILE'); // READ OPERATION

        try {
            await guard.canActivate(context);
        } catch (e: any) {
            // Should NOT block due to emergency switch
            expect(e.message).not.toContain('Emergency Restriction');
        }

        expect(logging.log).not.toHaveBeenCalledWith(expect.objectContaining({
            action: 'SECURITY_KILL_SWITCH_ACTIVE'
        }));
    });
});
