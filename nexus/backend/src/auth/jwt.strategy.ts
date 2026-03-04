import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SecurityStorageService } from '../common/services/security-storage.service';
import { Request } from 'express';

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
      // BUG-FIX: Previously only extracted from Bearer header.
      // Web clients store the JWT in an httpOnly cookie (nexus_token) — not the Authorization header.
      // This meant every authenticated web request after login returned 401.
      // Now we check the cookie first, then fall back to the Bearer header (used by mobile/API clients).
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // 1. Cookie extraction for web browser clients
          return request?.cookies?.['nexus_token'] ?? null;
        },
        // 2. Bearer token for mobile app and direct API clients
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      algorithms: ['HS256'],
      passReqToCallback: false,
      // @ts-ignore: passport-jwt passes unknown options to jsonwebtoken, which supports clockTolerance
      clockTolerance: 30, // 30-second tolerance for Render server clock skew
    } as any);
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
    // FIX-AUTH-02: Remove the `payload.tokenVersion &&` truthiness guard.
    // A tokenVersion of 0 is falsy and would bypass the check entirely.
    // Use null-coalesce on both sides to match the || 1 fallback used at sign time.
    if ((user.tokenVersion ?? 1) !== (payload.tokenVersion ?? 1)) {
      throw new UnauthorizedException('Session revoked due to password change. Please log in again.');
    }

    // Pass the payload directly.
    // TenantMembershipGuard will verify membership if tenantId is present.
    return payload;
  }
}
