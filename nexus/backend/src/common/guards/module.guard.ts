import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MODULE_KEY } from '../decorators/module.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { getIndustryConfig } from '../constants/industry-config';
import { Industry } from '@nexus/shared';

import { LoggingService } from '../services/logging.service';

@Injectable()
export class ModuleGuard implements CanActivate {
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

    const moduleName = this.reflector.getAllAndOverride<string>(MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const { user } = context.switchToHttp().getRequest();

    // --- Core Infrastructure Bypass (MUST run before channel check) ---
    // Core modules (auth, system, health) are always accessible with a valid token.
    // Do NOT gate these on channel presence — identity tokens for auth/tenants
    // must never be blocked by a missing channel field.
    const CORE_MODULES = ['auth', 'system', 'health'];
    const isCoreModule = CORE_MODULES.includes(moduleName || '');

    if (isCoreModule) {
      if (
        user &&
        user.type !== 'identity' &&
        user.type !== 'admin' &&
        !user.tenantId
      ) {
        throw new ForbiddenException('Tenant context missing');
      }
      return true;
    }

    // --- FIX-01: Fail-Closed Channel Enforcement (non-core modules only) ---
    const channel = user?.channel;
    if (!channel) {
      throw new ForbiddenException(
        'Security Violation: Channel identity is missing. Please re-login to anchor your session.',
      );
    }

    if (!moduleName) {
      if (channel === 'MOBILE') {
        await this.logging.log({
          userId: user?.sub,
          tenantId: user?.tenantId,
          action: 'SECURITY_VIOLATION_UNENROLLED_MODULE',
          resource: context.getClass().name,
          channel: 'MOBILE',
          details: {
            handler: context.getHandler().name,
            reason: 'Module registration missing',
          },
          ipAddress: context.switchToHttp().getRequest().ip,
        });
        throw new ForbiddenException(
          'Security Violation: This module is not explicitly enrolled for Mobile access. Please use the Web interface.',
        );
      }
      return true; // No module restriction defined
    }

    if (!user || !user.tenantId) {
      throw new ForbiddenException('User or Tenant context missing');
    }

    // Rule: Trust the token-based Industry Context for speed (Industry selection is persistent)
    // If the token is missing industry (e.g., legacy or old session), we use General as fallback
    const industry = user.industry || user.tenantType || Industry.General;

    const config = getIndustryConfig(industry);
    const isEnabled = config.enabledModules.includes(moduleName);

    if (!isEnabled) {
      await this.logging.log({
        userId: user.sub,
        tenantId: user.tenantId,
        action: 'COMPLIANCE_VIOLATION_DISABLED_MODULE',
        resource: moduleName,
        channel: channel,
        details: { industry, reason: 'Module disabled for industry' },
        ipAddress: context.switchToHttp().getRequest().ip,
      });
      throw new ForbiddenException(
        `Compliance Violation: The [${moduleName.toUpperCase()}] module is not enabled for your industry vertical (${industry}). Irrelevant flows are disabled by design.`,
      );
    }

    // Channel-Aware Gating: Block restricted modules on Mobile
    // --- INV-05: Hard Assertion - No Accounting on Mobile ---
    const isAccountingOnMobile =
      channel === 'MOBILE' && moduleName === 'accounting';

    if (
      isAccountingOnMobile ||
      (channel === 'MOBILE' &&
        config.mobileRestrictedModules?.includes(moduleName))
    ) {
      const auditAction = isAccountingOnMobile
        ? 'MANIFESTO_VIOLATION_INV_05'
        : 'CHANNEL_RESTRICTION_VIOLATION';
      const reason = isAccountingOnMobile
        ? 'INV-05: Hard-block of Accounting Ledger on Mobile channel'
        : 'Module restricted on Mobile channel';

      await this.logging.log({
        userId: user.sub,
        tenantId: user.tenantId,
        action: auditAction,
        resource: moduleName,
        channel: 'MOBILE',
        details: { industry, reason },
        ipAddress: context.switchToHttp().getRequest().ip,
      });
      throw new ForbiddenException(
        isAccountingOnMobile
          ? `Safety Violation: [INV-05] The Accounting Ledger is strictly restricted to the Web interface to ensure financial integrity. Mobile access is forbidden by design.`
          : `Channel Restriction: The [${moduleName.toUpperCase()}] module is restricted on Mobile for safety and audit integrity. Please use the canonical Web interface for this operation.`,
      );
    }

    return true;
  }
}
