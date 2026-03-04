import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';

/**
 * SEC-017: Zero-Downtime Webhook Secret Rotation Service
 *
 * Implements a "dual-secret" validation window to allow rotating webhook secrets
 * without requiring an immediate full-environment redeploy.
 *
 * Rotation Flow:
 * 1. Operator calls rotateSecret() → generates a new pending secret
 * 2. System stores BOTH old (active) and new (pending) secrets
 * 3. Signature validation accepts EITHER secret during the grace window (default: 24h)
 * 4. After the grace window expires (or operator confirms via commitRotation()),
 *    the old secret is permanently retired.
 *
 * This allows the operator to update the secret in Razorpay dashboard and let
 * in-flight webhooks from the old signature still succeed during the transition.
 */
@Injectable()
export class WebhookSecretRotationService {
    private readonly logger = new Logger(WebhookSecretRotationService.name);

    /** Default grace window: 24 hours. Old secret remains valid during this period. */
    private readonly GRACE_WINDOW_MS = 24 * 60 * 60 * 1000;

    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
    ) { }

    /**
     * Initiates a secret rotation for a given provider (e.g., 'Razorpay', 'Resend').
     * Returns the NEW secret that must be configured on the provider's dashboard.
     */
    async rotateSecret(provider: string, rotatedByUserId: string): Promise<{ newSecret: string; expiresAt: Date }> {
        const existingRotation = await (this.prisma as any).webhookSecretRotation.findFirst({
            where: { provider, status: 'Pending' },
        });

        if (existingRotation) {
            throw new BadRequestException(
                `A rotation for '${provider}' is already in progress. Commit or abort the existing rotation before starting a new one.`
            );
        }

        // Get the current active secret to archive it
        const currentActive = await (this.prisma as any).webhookSecretRotation.findFirst({
            where: { provider, status: 'Active' },
        });

        // Generate a strong new secret (32 bytes = 256 bits)
        const newSecret = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + this.GRACE_WINDOW_MS);

        await this.prisma.$transaction(async (tx) => {
            // Archive the old active secret
            if (currentActive) {
                await (tx as any).webhookSecretRotation.update({
                    where: { id: currentActive.id },
                    data: { status: 'Grace' }, // Still valid for validation during grace window
                });
            }

            // Create the new pending secret record
            await (tx as any).webhookSecretRotation.create({
                data: {
                    provider,
                    secret: newSecret, // Store encrypted in production (use KMS or vault)
                    status: 'Active',   // New secret is immediately active
                    rotatedBy: rotatedByUserId,
                    rotatedAt: new Date(),
                    graceExpiresAt: expiresAt,
                    previousSecretId: currentActive?.id || null,
                },
            });

            await tx.auditLog.create({
                data: {
                    tenantId: 'SYSTEM',
                    userId: rotatedByUserId,
                    action: 'WEBHOOK_SECRET_ROTATION_INITIATED',
                    resource: `WebhookSecret:${provider}`,
                    details: { provider, graceWindowHours: 24, expiresAt } as any,
                },
            });
        });

        this.logger.warn(`[SEC-017] Webhook secret rotation initiated for provider=${provider} by user=${rotatedByUserId}. Grace window: 24h.`);

        // NOTE: In production, encrypt 'newSecret' before returning.
        // Return it ONCE — it will never be shown again after this call.
        return { newSecret, expiresAt };
    }

    /**
     * Returns all currently valid secrets for a provider.
     * Used by the signature validation logic to accept both old (Grace) and new (Active) secrets.
     */
    async getValidSecrets(provider: string): Promise<string[]> {
        const now = new Date();
        const records = await (this.prisma as any).webhookSecretRotation.findMany({
            where: {
                provider,
                status: { in: ['Active', 'Grace'] },
                OR: [
                    { graceExpiresAt: null },
                    { graceExpiresAt: { gt: now } }, // Grace period not yet expired
                ],
            },
        });
        return records.map((r: any) => r.secret);
    }

    /**
     * Expires all grace-period secrets for a provider, finalising the rotation.
     * Call this after confirming the provider (e.g., Razorpay) is using the new secret.
     */
    async commitRotation(provider: string, userId: string): Promise<void> {
        const retired = await (this.prisma as any).webhookSecretRotation.updateMany({
            where: { provider, status: 'Grace' },
            data: { status: 'Retired', retiredAt: new Date() },
        });

        await this.prisma.auditLog.create({
            data: {
                tenantId: 'SYSTEM',
                userId,
                action: 'WEBHOOK_SECRET_ROTATION_COMMITTED',
                resource: `WebhookSecret:${provider}`,
                details: { provider, retiredSecrets: retired.count } as any,
            },
        });

        this.logger.log(`[SEC-017] Rotation committed for ${provider}. ${retired.count} grace secret(s) retired.`);
    }

    /**
     * Sweeps expired grace-period secrets automatically (called by a cron job).
     */
    async sweepExpiredGraceSecrets(): Promise<void> {
        const now = new Date();
        const expired = await (this.prisma as any).webhookSecretRotation.updateMany({
            where: {
                status: 'Grace',
                graceExpiresAt: { lte: now },
            },
            data: { status: 'Retired', retiredAt: now },
        });

        if (expired.count > 0) {
            this.logger.log(`[SEC-017] Auto-retired ${expired.count} expired grace secret(s).`);
        }
    }
}
