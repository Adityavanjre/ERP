/**
 * CSRF Double-Submit Cookie Guard
 *
 * Implements the double-submit cookie CSRF mitigation pattern for web channel requests.
 * This is the standard CSRF defense when using stateless JWTs without server-side sessions.
 *
 * HOW IT WORKS:
 * 1. On login (web channel), the server sets a CSRF token in a non-httpOnly cookie ("nexus-csrf").
 * 2. On every mutating request (POST, PUT, PATCH, DELETE), the frontend must include the same
 *    token value in the "X-CSRF-Token" header.
 * 3. This guard verifies the header matches the cookie. A cross-site request cannot read
 *    the cookie value (SameSite=Strict enforces this), so it cannot forge the header.
 *
 * ONLY APPLIED TO WEB CHANNEL:
 * Mobile apps do not use cookies, so CSRF does not apply to them. The guard reads the
 * AccessChannel from the JWT payload and skips validation for MOBILE tokens.
 *
 * SETUP:
 * Apply this guard globally in main.ts or selectively to specific controllers.
 * Frontend must read the "nexus-csrf" cookie and send it as "X-CSRF-Token" on mutations.
 *
 * Usage in controller:
 *   @UseGuards(JwtAuthGuard, CsrfGuard)
 *   @Post('some-mutating-endpoint')
 */

import {
    CanActivate,
    ExecutionContext,
    Injectable,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

const CSRF_EXEMPT_METHODS = ['GET', 'HEAD', 'OPTIONS'];

@Injectable()
export class CsrfGuard implements CanActivate {
    private readonly logger = new Logger(CsrfGuard.name);

    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const method = request.method?.toUpperCase();

        // CSRF only applies to state-mutating requests
        if (CSRF_EXEMPT_METHODS.includes(method)) {
            return true;
        }

        // Bearer token auth in the Authorization header is inherently CSRF-immune.
        // A cross-site attacker cannot forge the Authorization header (unlike cookies).
        // The frontend and backend are on different domains, so the cookie-based
        // double-submit CSRF pattern cannot function. Skip CSRF for Bearer token requests.
        const authHeader: string = request.headers?.['authorization'] || '';
        if (authHeader.startsWith('Bearer ')) {
            return true;
        }

        // CSRF only applies to web channel (mobile uses Authorization header, no cookies)
        const user = request.user;
        if (!user) {
            // If no user (e.g., @Public() route), skip CSRF — those routes don't have cookies
            return true;
        }

        const channel: string = user.channel || 'MOBILE';
        if (channel !== 'WEB') {
            return true;
        }

        // Verify double-submit cookie pattern
        const cookieToken: string | undefined = request.cookies?.['nexus-csrf'];
        const headerToken: string | undefined = request.headers?.['x-csrf-token'];

        if (!cookieToken || !headerToken) {
            this.logger.warn(
                `CSRF validation failed — missing token. Method: ${method}, Path: ${request.path}, IP: ${request.ip}`,
            );
            throw new ForbiddenException(
                'CSRF token missing. Web requests require the X-CSRF-Token header matching the nexus-csrf cookie.',
            );
        }

        // Constant-time comparison to prevent timing attacks
        const cookieBuf = Buffer.from(cookieToken);
        const headerBuf = Buffer.from(headerToken);

        if (
            cookieBuf.length !== headerBuf.length ||
            !require('crypto').timingSafeEqual(cookieBuf, headerBuf)
        ) {
            this.logger.warn(
                `CSRF validation failed — token mismatch. Method: ${method}, Path: ${request.path}, IP: ${request.ip}`,
            );
            throw new ForbiddenException('CSRF token invalid.');
        }

        return true;
    }
}
