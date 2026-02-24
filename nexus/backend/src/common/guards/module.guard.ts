import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MODULE_KEY } from '../decorators/module.decorator';
import { getIndustryConfig } from '../constants/industry-config';

@Injectable()
export class ModuleGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const moduleName = this.reflector.getAllAndOverride<string>(MODULE_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!moduleName) {
            return true; // No module restriction defined
        }

        const { user } = context.switchToHttp().getRequest();
        if (!user || !user.tenantId) {
            throw new ForbiddenException('User or Tenant context missing');
        }

        // Rule: Trust the token-based Industry Context for speed (Industry selection is persistent)
        // If the token is missing industry (e.g., legacy or old session), we use General as fallback
        const industry = user.industry || user.tenantType || 'General';

        const config = getIndustryConfig(industry);
        const isEnabled = config.enabledModules.includes(moduleName);

        if (!isEnabled) {
            throw new ForbiddenException(
                `Compliance Violation: The [${moduleName.toUpperCase()}] module is not enabled for your industry vertical (${industry}). Irrelevant flows are disabled by design.`
            );
        }

        return true;
    }
}
