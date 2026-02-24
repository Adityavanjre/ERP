import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MFA_REQUIRED_KEY } from '../decorators/mfa-required.decorator';

@Injectable()
export class MfaGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const isMfaRequired = this.reflector.getAllAndOverride<boolean>(MFA_REQUIRED_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!isMfaRequired) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();

        // The user object in req is populated by JwtAuthGuard.
        // We expect it to have an 'mfaVerified' flag.
        if (!user || user.mfaEnabled && !user.isMfaVerified) {
            throw new UnauthorizedException('Multi-factor authentication required for this action');
        }

        return true;
    }
}
