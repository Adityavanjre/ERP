import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    SetMetadata,
    Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BillingService, PlanResource } from '../../system/services/billing.service';

// ---------------------------------------------------------------------------
// Decorator
// ---------------------------------------------------------------------------
export const PLAN_LIMIT_KEY = 'planLimit';
export const PlanLimit = (resource: PlanResource) =>
    SetMetadata(PLAN_LIMIT_KEY, resource);

// ---------------------------------------------------------------------------
// Write operations that trigger read-only / suspension checks
// ---------------------------------------------------------------------------
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class PlanGuard implements CanActivate {
    private readonly logger = new Logger(PlanGuard.name);

    constructor(
        private readonly reflector: Reflector,
        private readonly billing: BillingService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const tenantId: string | undefined = request.user?.tenantId;

        // No tenantId means unauthenticated — let JwtAuthGuard handle it
        if (!tenantId) return true;

        const isWrite = WRITE_METHODS.has(request.method);

        // 1. Enforce subscription status (Suspended / ReadOnly / GracePeriod)
        //    Fail-open: billing errors never block requests
        try {
            await this.billing.enforceAccess(tenantId, isWrite);
        } catch (err: any) {
            // Re-throw ForbiddenException and GoneException — these are intentional
            if (err.status === 403 || err.status === 410) throw err;
            // Any other error (DB down etc.) — fail-open
            this.logger.error('[PlanGuard] enforceAccess threw unexpectedly — fail-open', err);
            return true;
        }

        // 2. Enforce specific resource quota if @PlanLimit() decorator is present
        const resource = this.reflector.getAllAndOverride<PlanResource>(PLAN_LIMIT_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (resource) {
            try {
                await this.billing.checkQuota(tenantId, resource);
            } catch (err: any) {
                if (err.status === 403) throw err;
                this.logger.error('[PlanGuard] checkQuota threw unexpectedly — fail-open', err);
            }
        }

        return true;
    }
}
