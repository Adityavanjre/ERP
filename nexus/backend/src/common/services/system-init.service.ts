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

        const adminEmail = rawEmail.toLowerCase();

        // Use provided password or a safe fallback to satisfy types and initial setup
        const adminPassword = rawPassword || 'password123';

        if (!rawPassword) {
            this.logger.warn('ADMIN_PASSWORD not set. Using default "password123" for sync.');
        }

        this.logger.log(`Syncing Super Admin: ${adminEmail}`);

        try {
            const passwordHash: string = await bcrypt.hash(adminPassword, 10);

            // Check if user exists
            const existingUser = await this.prisma.user.findUnique({
                where: { email: adminEmail }
            });

            if (existingUser) {
                // Update existing user to ensure they are super admin and have the latest password if provided
                const updateData: any = { isSuperAdmin: true };
                if (rawPassword) {
                    updateData.passwordHash = passwordHash;
                }

                await this.prisma.user.update({
                    where: { id: existingUser.id },
                    data: updateData
                });
                this.logger.log(`Super Admin verified/updated: ${adminEmail} (Nexus Primary)`);
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
