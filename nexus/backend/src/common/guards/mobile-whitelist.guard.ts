import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MOBILE_ACTION_KEY } from '../decorators/mobile-action.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { MOBILE_WHITELIST, Industry } from '@nexus/shared';

import { LoggingService } from '../services/logging.service';

@Injectable()
export class MobileWhitelistGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private logging: LoggingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user, body } = request;

    // 1. Identify Channel (Fail-Closed if missing)
    const channel = user?.channel;
    if (!channel) {
      throw new ForbiddenException(
        'Security Violation: Access channel not identified.',
      );
    }

    // 2. Short-circuit if not MOBILE
    if (channel !== 'MOBILE') {
      return true;
    }

    // --- EMERGENCY KILL SWITCH ---
    // If MOBILE_WRITE_ENABLED is 'false', all mobile write operations are instantly blocked.
    const isWriteAction = ['POST', 'PATCH', 'DELETE', 'PUT'].includes(
      request.method,
    );
    const mobileWriteEnabled = process.env.MOBILE_WRITE_ENABLED !== 'false';

    if (isWriteAction && !mobileWriteEnabled) {
      await this.logging.log({
        userId: user?.sub,
        tenantId: user?.tenantId,
        action: 'SECURITY_KILL_SWITCH_ACTIVE',
        resource: context.getClass().name,
        channel: 'MOBILE',
        details: {
          method: request.method,
          reason: 'MOBILE_WRITE_ENABLED is set to false',
        },
        ipAddress: request.ip,
      });
      throw new ForbiddenException(
        'Emergency Restriction: Mobile write operations are currently disabled by the system administrator.',
      );
    }

    // 3. Get Action ID from Decorator
    const actionId = this.reflector.getAllAndOverride<string>(
      MOBILE_ACTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 4. BLOCK BY DEFAULT: If on mobile and no Action ID is registered, block access.
    if (!actionId) {
      await this.logging.log({
        userId: user?.sub,
        tenantId: user?.tenantId,
        action: 'SECURITY_VIOLATION_UNWHITELISTED_ACTION',
        resource: context.getClass().name,
        channel: 'MOBILE',
        details: {
          handler: context.getHandler().name,
          reason: 'Action not in Mobile Whitelist',
        },
        ipAddress: request.ip,
      });
      throw new ForbiddenException(
        `Security Violation: This action is not whitelisted for Mobile access. Please use the Web interface. (Action: ${context.getHandler().name})`,
      );
    }

    const feature = MOBILE_WHITELIST[actionId];

    // 5. Verify Whitelist Enrollment
    if (!feature) {
      await this.logging.log({
        userId: user?.sub,
        tenantId: user?.tenantId,
        action: 'SECURITY_VIOLATION_UNCONFIGURED_ACTION',
        resource: actionId,
        channel: 'MOBILE',
        details: { reason: 'Action configuration missing in Shared Truth' },
        ipAddress: request.ip,
      });
      throw new ForbiddenException(
        `Security Violation: Action '${actionId}' is not whitelisted for Mobile.`,
      );
    }

    // 6. Enforce Role Requirements
    const isIdentityToken = user.type === 'identity';
    const hasRequiredRole =
      user.role && feature.requiredRoles.includes(user.role);

    // ALLOWANCE: Identity tokens are allowed for whitelisted infrastructure actions
    // even if they don't have a specific tenant role yet.
    if (!hasRequiredRole && !isIdentityToken) {
      await this.logging.log({
        userId: user.sub,
        tenantId: user.tenantId,
        action: 'SECURITY_VIOLATION_UNAUTHORIZED_ROLE',
        resource: actionId,
        channel: 'MOBILE',
        details: { role: user.role, requiredRoles: feature.requiredRoles },
        ipAddress: request.ip,
      });
      throw new ForbiddenException(
        `Security Violation: Role '${user.role}' is not authorized to perform '${actionId}' on Mobile.`,
      );
    }

    // 7. Enforce Industry Requirements (if any)
    const industry = user.industry || user.tenantType || Industry.General;
    if (feature.requiredIndustries && feature.requiredIndustries.length > 0) {
      if (!feature.requiredIndustries.includes(industry as Industry)) {
        await this.logging.log({
          userId: user.sub,
          tenantId: user.tenantId,
          action: 'SECURITY_VIOLATION_RESTRICTED_INDUSTRY',
          resource: actionId,
          channel: 'MOBILE',
          details: { industry, requiredIndustries: feature.requiredIndustries },
          ipAddress: request.ip,
        });
        throw new ForbiddenException(
          `Security Violation: Action '${actionId}' is restricted in your industry vertical on Mobile.`,
        );
      }
    }

    // 8. Enforce Status Transition Safety (MANDATORY for POST/PATCH)
    if (request.method === 'POST' || request.method === 'PATCH') {
      const transitions = feature.allowedStatusTransitions;

      // --- FIX-02: Fail-Closed Transition Gasket ---
      // We no longer skip if config is missing. For Mobile write-actions,
      // the transition matrix MUST be defined to prevent silent state mutations.
      if (!transitions || transitions.length === 0) {
        await this.logging.log({
          userId: user.sub,
          tenantId: user.tenantId,
          action: 'SECURITY_VIOLATION_MISSING_TRANSITION_CONFIG',
          resource: actionId,
          channel: 'MOBILE',
          details: { reason: 'Write-action lacks transition safety matrix' },
          ipAddress: request.ip,
        });
        throw new ForbiddenException(
          `Security Violation: This write-action (${actionId}) is not fully certified for Mobile use. Missing state-transition matrix.`,
        );
      }

      const targetStatus = body?.status;

      // TIGHTENED (Relaxed for non-status updates):
      // If body.status is provided, we MUST validate it against the matrix.
      // If it's missing, we allow the request to proceed (intended for non-state updates like notes).
      if (targetStatus) {
        const isAllowed = transitions.some((t) => t.to === targetStatus);

        if (!isAllowed) {
          await this.logging.log({
            userId: user.sub,
            tenantId: user.tenantId,
            action: 'SECURITY_VIOLATION_FORBIDDEN_TRANSITION',
            resource: actionId,
            channel: 'MOBILE',
            details: {
              targetStatus,
              allowed: transitions.map((t: any) => t.to),
            },
            ipAddress: request.ip,
          });
          throw new ForbiddenException(
            `Security Violation: Transition to '${targetStatus}' for '${actionId}' is not authorized on Mobile. Only: ${transitions.map((t: any) => t.to).join(', ')}`,
          );
        }
      }

      // --- INV-06: Binary Approval Zero-Mutation Enforcement ---
      const isApprovalAction =
        actionId.startsWith('APPROVE') ||
        actionId.includes('DECIDE') ||
        actionId.includes('REJECT');
      if (isApprovalAction) {
        const allowedKeys = [
          'status',
          'reason',
          'rejectReason',
          'idempotencyKey',
        ];
        const illegalKeys = Object.keys(body).filter(
          (k) => !allowedKeys.includes(k),
        );

        // 1. Block mutations of non-whitelisted fields
        if (illegalKeys.length > 0) {
          await this.logging.log({
            userId: user.sub,
            tenantId: user.tenantId,
            action: 'SECURITY_VIOLATION_MUTATION_ATTEMPT',
            resource: actionId,
            channel: 'MOBILE',
            details: {
              illegalKeys,
              reason:
                'Mobile approvals must be binary-only. Mutation forbidden.',
            },
            ipAddress: request.ip,
          });
          throw new ForbiddenException(
            `Security Violation: [INV-06] Mobile approvals are binary-only. Mutation of business fields (${illegalKeys.join(', ')}) is forbidden.`,
          );
        }

        // 2. Enforce Idempotency Key presence
        if (!body.idempotencyKey) {
          await this.logging.log({
            userId: user.sub,
            tenantId: user.tenantId,
            action: 'SECURITY_VIOLATION_MISSING_IDEMPOTENCY',
            resource: actionId,
            channel: 'MOBILE',
            details: {
              reason:
                'Mobile approvals/rejections require a client-generated idempotency key',
            },
            ipAddress: request.ip,
          });
          throw new ForbiddenException(
            `Security Violation: An 'idempotencyKey' is required for all mobile-originated approvals/rejections to prevent duplicate mutations.`,
          );
        }
      }
    }

    return true;
  }
}
