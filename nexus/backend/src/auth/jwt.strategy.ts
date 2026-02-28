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
    const jwtSecret = config.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('FATAL: JWT_SECRET environment variable is not set. Refusing to start with an insecure secret.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: any) => {
          return req?.cookies?.nexus_token || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      algorithms: ['HS256'],
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

    // 3. Global Invalidation (Password Change)
    // Use the same fallback as generateAuthResponse (|| 1) so null DB values
    // don't cause a false mismatch against tokens signed with tokenVersion: 1.
    if (payload.tokenVersion && (user.tokenVersion ?? 1) !== payload.tokenVersion) {
      throw new UnauthorizedException('Session revoked due to password change. Please log in again.');
    }

    // Pass the payload directly. 
    // TenantMembershipGuard will verify membership if tenantId is present.
    return payload;
  }
}
