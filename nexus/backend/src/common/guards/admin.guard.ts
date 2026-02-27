import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggingService } from '../services/logging.service';

@Injectable()
export class AdminGuard implements CanActivate {
    constructor(
        private config: ConfigService,
        private logging: LoggingService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.isSuperAdmin || user.type !== 'admin') {
            throw new ForbiddenException('Super-Admin authorized session required. Please use the admin login pipeline.');
        }

        // IP Allowlist Check
        const allowlistStr = this.config.get<string>('ADMIN_IP_ALLOWLIST');
        if (allowlistStr) {
            const allowlist = allowlistStr.split(',').map((ip) => ip.trim());
            const clientIp = request.ip || request.get('X-Forwarded-For') || request.connection.remoteAddress;

            const isAllowed = allowlist.some(allowedIp => {
                if (allowedIp.includes('/')) {
                    // Simple CIDR check could be implemented here if needed
                    // For now, supporting exact matches or simple prefix matches
                    return clientIp.startsWith(allowedIp.split('/')[0]);
                }
                return allowedIp === clientIp || clientIp === '::1' || clientIp === '127.0.0.1';
            });

            if (!isAllowed) {
                await this.logging.log({
                    userId: user.sub,
                    action: 'SECURITY_VIOLATION_ADMIN_IP_REJECTED',
                    resource: context.getClass().name,
                    details: { ip: clientIp, reason: 'IP not in allowlist' },
                });
                throw new ForbiddenException('Admin access forbidden from this IP address');
            }
        }

        return true;
    }
}
