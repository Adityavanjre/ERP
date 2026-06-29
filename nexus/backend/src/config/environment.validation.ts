import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Environment Validation Middleware
 * 
 * Validates that all required environment variables are set before
 * the application processes any requests. Prevents startup with
 * misconfigured security settings.
 */
@Injectable()
export class EnvironmentValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(EnvironmentValidationMiddleware.name);
  private validated = false;

  use(req: Request, res: Response, next: NextFunction): void {
    if (!this.validated) {
      this.validateEnvironment();
      this.validated = true;
    }
    next();
  }

  private validateEnvironment(): void {
    const requiredEnvVars = [
      { name: 'NODE_ENV', description: 'Environment mode (development/production)' },
      { name: 'DATABASE_URL', description: 'PostgreSQL connection string' },
      { name: 'DIRECT_URL', description: 'Direct PostgreSQL connection for admin operations' },
      { name: 'JWT_SECRET', description: 'JWT signing secret (min 32 chars recommended)' },
      { name: 'FRONTEND_URL', description: 'Frontend base URL for redirects' },
      { name: 'BACKEND_URL', description: 'Backend base URL' },
    ];

    const missingVars: string[] = [];
    const weakVars: string[] = [];

    requiredEnvVars.forEach(({ name, description }) => {
      const value = process.env[name];
      
      if (!value || value === '' || value.includes('placeholder') || value.includes('replace-with') || value.includes('your_')) {
        missingVars.push(`${name} (${description})`);
      } else if (name === 'JWT_SECRET' && value.length < 32) {
        weakVars.push(`${name} (JWT_SECRET too short: ${value.length} chars, recommend 32+)`);
      } else if (name === 'ADMIN_PASSWORD' && value.includes('replace-with')) {
        weakVars.push(`${name} (admin password not changed from default)`);
      }
    });

    // Check MFA and Audit secrets separately
    const mfaKey = process.env.MFA_ENCRYPTION_KEY;
    if (mfaKey && (mfaKey.length !== 32 && mfaKey.length !== 64)) {
      weakVars.push(`MFA_ENCRYPTION_KEY (expected 32 or 64 chars, got ${mfaKey.length})`);
    }

    const auditSecret = process.env.AUDIT_HMAC_SECRET;
    if (auditSecret && (auditSecret.includes('placeholder') || auditSecret.includes('replace-with'))) {
      missingVars.push(`AUDIT_HMAC_SECRET (HMAC signing secret)`); // Not really missing, but insecure
    }

    // Log and throw if critical issues found
    if (missingVars.length > 0 || weakVars.length > 0) {
      const message = this.buildValidationMessage(missingVars, weakVars);
      
      if (process.env.NODE_ENV === 'production') {
        this.logger.error('CRITICAL: Environment validation failed in production!');
        this.logger.error(message);
        throw new Error('Environment validation failed. Check logs for details.');
      } else {
        // In development, warn but allow startup
        this.logger.warn('DEVELOPMENT MODE: Environment validation warnings:');
        this.logger.warn(message);
        this.logger.warn('⚠️  This is a development environment. Fix these issues before production!');
      }
    } else {
      this.logger.log('Environment validation passed successfully');
    }
  }

  private buildValidationMessage(missing: string[], weak: string[]): string {
    let message = '\n';
    
    if (missing.length > 0) {
      message += '❌ Missing or insecure environment variables:\n';
      missing.forEach(varName => {
        message += `   - ${varName}\n`;
      });
    }

    if (weak.length > 0) {
      message += '⚠️  Weak or default environment variables:\n';
      weak.forEach(varName => {
        message += `   - ${varName}\n`;
      });
    }

    message += '\n📋 Required actions:\n';
    message += '   1. Copy .env.example to .env: cp .env.example .env\n';
    message += '   2. Fill in all placeholder values with secure credentials\n';
    message += '   3. Generate secure secrets with: openssl rand -hex 32\n';
    message += '   4. Never commit .env files to version control\n';
    message += '   5. Use secrets management (Vault, AWS Secrets Manager) in production\n';

    return message;
  }
}
