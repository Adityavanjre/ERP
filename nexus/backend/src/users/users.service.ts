
import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateRoleDto } from './dto/users.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    const memberships = await this.prisma.tenantUser.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            createdAt: true,
          },
        },
      },
    });

    return memberships.map((m) => ({
      id: m.userId,
      email: m.user.email,
      fullName: m.user.fullName,
      role: m.role,
      joinedAt: m.user.createdAt,
    }));
  }

  async create(tenantId: string, dto: CreateUserDto) {
    // 1. Check if user already exists
    let user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // 2. Transact: Create user (if new) and membership
    return this.prisma.$transaction(async (tx) => {
      if (!user) {
        const salt = await bcrypt.genSalt();
        const defaultPassword = await bcrypt.hash('password123', salt);
        user = await tx.user.create({
          data: {
            email: dto.email,
            fullName: dto.fullName,
            passwordHash: defaultPassword,
          },
        });
      }

      // Check for existing membership in THIS tenant
      const existingMembership = await tx.tenantUser.findUnique({
        where: {
          userId_tenantId: {
            userId: user.id,
            tenantId,
          },
        },
      });

      if (existingMembership) {
        throw new ConflictException('User is already a member of this tenant');
      }

      return tx.tenantUser.create({
        data: {
          userId: user.id,
          tenantId,
          role: dto.role,
        },
      });
    });
  }

  async updateRole(tenantId: string, userId: string, dto: UpdateRoleDto) {
    const membership = await this.prisma.tenantUser.findUnique({
      where: {
        userId_tenantId: { userId, tenantId },
      },
    });

    if (!membership) {
      throw new NotFoundException('User not found in tenant');
    }

    // Protection: Cannot demote the last Owner
    if (membership.role === Role.Owner && dto.role !== Role.Owner) {
      const ownerCount = await this.prisma.tenantUser.count({
        where: { tenantId, role: Role.Owner },
      });
      if (ownerCount <= 1) {
        throw new ForbiddenException('Tenant must have at least one Owner');
      }
    }

    return this.prisma.tenantUser.update({
      where: {
        userId_tenantId: { userId, tenantId },
      },
      data: { role: dto.role },
    });
  }

  async resetPassword(tenantId: string, userId: string) {
    const membership = await this.prisma.tenantUser.findUnique({
      where: {
        userId_tenantId: { userId, tenantId },
      },
    });

    if (!membership) {
      throw new NotFoundException('User not found in tenant');
    }

    // Generate a random 8-char secure pattern
    const rawPassword = Math.random().toString(36).slice(-8).toUpperCase();
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { temporaryPassword: rawPassword };
  }

  async remove(tenantId: string, userId: string) {
    const membership = await this.prisma.tenantUser.findUnique({
      where: {
        userId_tenantId: { userId, tenantId },
      },
    });

    if (!membership) {
      throw new NotFoundException('User not found in tenant');
    }

    if (membership.role === Role.Owner) {
      const ownerCount = await this.prisma.tenantUser.count({
        where: { tenantId, role: Role.Owner },
      });
      if (ownerCount <= 1) {
        throw new ForbiddenException('Cannot remove the only Owner');
      }
    }

    return this.prisma.tenantUser.delete({
      where: {
        userId_tenantId: { userId, tenantId },
      },
    });
  }
}
