import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MachineStatus } from '@prisma/client';
import { AuditService } from '../system/services/audit.service';

@Injectable()
export class MachineService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) { }

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
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async updateMachineStatus(tenantId: string, id: string, status: MachineStatus) {
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

  async deleteMachine(tenantId: string, id: string) {
    const machine = await this.prisma.machine.findFirst({
      where: { id, tenantId },
    });

    if (!machine) {
      throw new NotFoundException(`Machine ${id} not found`);
    }

    await this.prisma.machine.updateMany({
      where: { id, tenantId },
      data: { status: 'Offline' as MachineStatus },
    });

    await this.audit.log({
      tenantId,
      action: 'DELETE',
      resource: 'Machine',
      details: { id, name: machine.name },
    });

    return { success: true };
  }
}
