import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SecurityStorageService } from '../common/services/security-storage.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private security: SecurityStorageService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') || 'supersecreterpkey',
    });
  }

  async validate(payload: any) {
    // 1. JTI Blacklist Check (Revocation Logic)
    if (payload.jti && await this.security.isTokenBlacklisted(payload.jti)) {
      throw new UnauthorizedException('This session has been revoked.');
    }

    // 2. Basic account verification
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Account not found');
    }

    // Pass the payload directly. 
    // TenantMembershipGuard will verify membership if tenantId is present.
    return payload;
  }
}
