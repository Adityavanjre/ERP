import { Module, forwardRef } from '@nestjs/common';
import { SystemModule } from '../system/system.module';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './google-auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { PassportModule } from '@nestjs/passport';
import { AccountingModule } from '../accounting/accounting.module';
import { LoggingService } from '../common/services/logging.service';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    forwardRef(() => AccountingModule),
    forwardRef(() => SystemModule),
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'supersecreterpkey',
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy, GoogleAuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule { }
