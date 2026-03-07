import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { AuthProvider } from '@prisma/client';

@Injectable()
export class SystemInitService implements OnApplicationBootstrap {
    private readonly logger = new Logger(SystemInitService.name);

    constructor(private prisma: PrismaService) { }

    async onApplicationBootstrap() {
        await this.syncSuperAdmin();
    }

    private async syncSuperAdmin() {
        const rawEmail = process.env.ADMIN_EMAIL?.trim() || 'adityavanjre111@gmail.com';
        const rawPassword = process.env.ADMIN_PASSWORD?.trim();

        if (!rawPassword) {
            this.logger.warn('ADMIN_PASSWORD not set. Super Admin sync might be incomplete or using previous password.');
        }

        const adminEmail = rawEmail.toLowerCase();
        const adminPassword = rawPassword;
        this.logger.log(`Syncing Super Admin: ${adminEmail}`);

        try {
            const passwordHash = await bcrypt.hash(adminPassword, 10);

            // Check if user exists
            const existingUser = await this.prisma.user.findUnique({
                where: { email: adminEmail }
            });

            if (existingUser) {
                // Update existing user to ensure they are super admin and have the latest password
                await this.prisma.user.update({
                    where: { id: existingUser.id },
                    data: {
                        isSuperAdmin: true,
                        passwordHash: passwordHash
                    }
                });
                this.logger.log(`Super Admin updated: ${adminEmail} (Nexus Primary)`);
            } else {
                // Create new super admin
                await this.prisma.user.create({
                    data: {
                        email: adminEmail,
                        passwordHash: passwordHash,
                        fullName: 'System Administrator',
                        isSuperAdmin: true,
                        authProvider: AuthProvider.Email,
                        tokenVersion: 1
                    }
                });
                this.logger.log(`[PROVED] Super Admin created and verified: ${adminEmail}`);
            }
        } catch (error) {
            this.logger.error(`Failed to sync Super Admin: ${error.message}`);
        }
    }
}
