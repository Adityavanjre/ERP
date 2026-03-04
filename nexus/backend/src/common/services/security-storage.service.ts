import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SecurityStorageService {
    constructor(private prisma: PrismaService) { }

    async blacklistToken(jti: string, exp: number) {
        const expiresAt = new Date(exp * 1000);

        // SEC-006: Use DB-backed revocation for persistence across restarts.
        await this.prisma.revokedToken.upsert({
            where: { jti },
            update: { expiresAt },
            create: { jti, expiresAt },
        });
    }

    async isTokenBlacklisted(jti: string): Promise<boolean> {
        if (!jti) return false;

        const revoked = await this.prisma.revokedToken.findUnique({
            where: { jti },
        });

        return !!revoked;
    }

    /**
     * Optional: Cleanup hook to purge expired tokens from the DB.
     * Can be called from a Cron job.
     */
    async purgeExpiredTokens() {
        await this.prisma.revokedToken.deleteMany({
            where: { expiresAt: { lt: new Date() } },
        });
    }
}
