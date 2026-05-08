import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleAuthService } from './google-auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { AccountingService } from '../accounting/accounting.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { MailService } from '../system/services/mail.service';
import { LoggingService } from '../common/services/logging.service';
import { AnomalyAlertService } from '../common/services/anomaly-alert.service';
import { MfaCryptoService } from './mfa-crypto.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: AccountingService,
          useValue: {},
        },
        {
          provide: TenantContextService,
          useValue: {},
        },
        {
          provide: MailService,
          useValue: {},
        },
        {
          provide: GoogleAuthService,
          useValue: {},
        },
        {
          provide: LoggingService,
          useValue: {},
        },
        {
          provide: AnomalyAlertService,
          useValue: {},
        },
        {
          provide: MfaCryptoService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('refreshSession', () => {
    it('should throw UnauthorizedException when jwtService.verify throws an error', async () => {
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshSession('invalid_refresh_token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshSession('invalid_refresh_token')).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });
  });
});
