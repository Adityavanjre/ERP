import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AccountingService } from '../accounting/accounting.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { MailService } from '../system/services/mail.service';
import { GoogleAuthService } from './google-auth.service';
import { LoggingService } from '../common/services/logging.service';
import { AnomalyAlertService } from '../common/services/anomaly-alert.service';
import { MfaCryptoService } from './mfa-crypto.service';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hash'),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: any;
  let loggingService: any;

  beforeEach(async () => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    loggingService = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaService },
        { provide: JwtService, useValue: {} },
        { provide: ConfigService, useValue: {} },
        { provide: AccountingService, useValue: {} },
        { provide: TenantContextService, useValue: {} },
        { provide: MailService, useValue: {} },
        { provide: GoogleAuthService, useValue: {} },
        { provide: LoggingService, useValue: loggingService },
        { provide: AnomalyAlertService, useValue: {} },
        { provide: MfaCryptoService, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should successfully register a user even if telemetry logging fails', async () => {
      // Setup mock implementation
      prismaService.user.findUnique.mockResolvedValueOnce(null); // No existing user

      const mockUser = { id: 'user-1', email: 'test@test.com' };
      const mockTenant = { id: 'tenant-1', type: 'Retail' };

      // We need to mock $transaction to actually execute the callback
      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          user: { create: jest.fn().mockResolvedValue(mockUser) },
          tenant: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockTenant)
          },
          tenantUser: { create: jest.fn() },
        };
        return callback(tx);
      });

      // Mock generateAuthResponse
      service['generateAuthResponse'] = jest.fn().mockResolvedValue({ token: 'test-token' });

      // Mock accountingService
      (service as any).accountingService = {
        initializeTenantAccounts: jest.fn().mockResolvedValue(undefined)
      };

      // Set up the telemetry logging to throw an error
      loggingService.log.mockRejectedValueOnce(new Error('Telemetry service offline'));

      // We should spy on logger to ensure we logged the warning
      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

      const result = await service.register({
        email: 'test@test.com',
        password: 'password123',
        fullName: 'Test User',
        tenantName: 'Test Tenant',
        companyType: 'Retail'
      });

      expect(result).toBeDefined();
      expect(loggingService.log).toHaveBeenCalled();
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AUTH_REGISTER] Telemetry logging failed')
      );
    });
  });
});
