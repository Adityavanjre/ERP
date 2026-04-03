import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MachineStatus } from '@prisma/client';
import { AuditService } from '../system/services/audit.service';

@Injectable()
export class MachineService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async createMachine(tenantId: string, data: any) {
    const machine = await this.prisma.machine.create({
      data: {
        ...data,
        tenantId,
      },
    });

    await this.audit.log({
      tenantId,
      action: 'CREATE',
      resource: 'Machine',
      details: { id: machine.id, name: machine.name },
    });

    return machine;
  }

  async getMachines(tenantId: string) {
    return this.prisma.machine.findMany({
      where: { tenantId, isDeleted: false },
      orderBy: { name: 'asc' },
    });
  }

  async updateMachineStatus(
    tenantId: string,
    id: string,
    status: MachineStatus,
  ) {
    const machine = await this.prisma.machine.findFirst({
      where: { id, tenantId },
    });

    if (!machine) {
      throw new NotFoundException(`Machine ${id} not found`);
    }

    const updated = await this.prisma.machine.updateMany({
      where: { id, tenantId },
      data: { status },
    });

    await this.audit.log({
      tenantId,
      action: 'UPDATE_STATUS',
      resource: 'Machine',
      details: { id, oldStatus: machine.status, newStatus: status },
    });

    return updated;
  }

  async updateMachine(
    tenantId: string,
    id: string,
    data: {
      name?: string;
      code?: string;
      type?: string;
      hourlyRate?: number;
      description?: string;
      manufacturer?: string;
      model?: string;
      serialNumber?: string;
    },
  ) {
    const machine = await this.prisma.machine.findFirst({
      where: { id, tenantId },
    });

    if (!machine) {
      throw new NotFoundException(`Machine ${id} not found`);
    }

    const updated = await this.prisma.machine.update({
      where: { id },
      data: { ...data },
    });

    await this.audit.log({
      tenantId,
      action: 'UPDATE',
      resource: 'Machine',
      details: { id, changes: data },
    });

    return updated;
  }

  async deleteMachine(tenantId: string, id: string) {
    const machine = await this.prisma.machine.findFirst({
      where: { id, tenantId },
      include: { workOrders: { take: 1 } },
    });

    if (!machine) {
      throw new NotFoundException(`Machine ${id} not found`);
    }

    if ((machine.workOrders?.length ?? 0) > 0) {
      // FREEZE: Has associated data, set to Offline (frozen state)
      await this.prisma.machine.updateMany({
        where: { id, tenantId },
        data: { status: 'Offline' as MachineStatus },
      });

      await this.audit.log({
        tenantId,
        action: 'FREEZE',
        resource: 'Machine',
        details: {
          id,
          name: machine.name,
          reason: 'Has associated work orders',
        },
      });

      return {
        success: true,
        action: 'frozen',
        reason: 'Machine has associated work orders and cannot be deleted',
      };
    } else {
      // SOFT DELETE: Preserve auditability while hiding the machine from active views
      await this.prisma.machine.updateMany({
        where: { id, tenantId },
        data: { isDeleted: true, deletedAt: new Date() },
      });

      await this.audit.log({
        tenantId,
        action: 'DELETE',
        resource: 'Machine',
        details: { id, name: machine.name },
      });

      return { success: true, action: 'deleted' };
    }
  }
}
