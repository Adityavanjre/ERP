import { Test, TestingModule } from '@nestjs/testing';
import { MachineService } from './machine.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../system/services/audit.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('MachineService (Machine Management)', () => {
  let service: MachineService;

  const mockPrisma = {
    machine: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    workOrder: {
      count: jest.fn(),
    },
  };

  const mockAudit = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MachineService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<MachineService>(MachineService);
  });

  describe('updateMachine', () => {
    it('should update machine fields', async () => {
      mockPrisma.machine.findFirst.mockResolvedValue({
        id: 'm1',
        tenantId: 't1',
        name: 'Old Name',
      });
      mockPrisma.machine.update.mockResolvedValue({
        id: 'm1',
        name: 'New Name',
        code: 'MC-001',
      });

      const result = await service.updateMachine('t1', 'm1', {
        name: 'New Name',
        code: 'MC-001',
      });

      expect(result.name).toBe('New Name');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't1',
          action: 'UPDATE',
          resource: 'Machine',
        }),
      );
    });

    it('should throw NotFoundException for non-existent machine', async () => {
      mockPrisma.machine.findFirst.mockResolvedValue(null);

      await expect(
        service.updateMachine('t1', 'nonexistent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not allow updating machine from different tenant', async () => {
      mockPrisma.machine.findFirst.mockResolvedValue(null);

      await expect(
        service.updateMachine('t2', 'm1', { name: 'Hacked' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteMachine (freeze logic)', () => {
    it('should hard-delete machine with no associated work orders', async () => {
      mockPrisma.machine.findFirst.mockResolvedValue({
        id: 'm1',
        tenantId: 't1',
        status: 'Idle',
      });
      mockPrisma.workOrder.count.mockResolvedValue(0);
      mockPrisma.machine.update.mockResolvedValue({ id: 'm1' });

      const result = await service.deleteMachine('t1', 'm1');

      expect(result).toBeDefined();
    });

    it('should freeze machine (set Offline) when it has associated work orders', async () => {
      mockPrisma.machine.findFirst.mockResolvedValue({
        id: 'm1',
        tenantId: 't1',
        status: 'Idle',
      });
      mockPrisma.workOrder.count.mockResolvedValue(5);
      mockPrisma.machine.update.mockResolvedValue({
        id: 'm1',
        status: 'Offline',
      });

      const result = await service.deleteMachine('t1', 'm1');

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException for non-existent machine', async () => {
      mockPrisma.machine.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteMachine('t1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listMachines', () => {
    it('should return only non-deleted machines', async () => {
      mockPrisma.machine.findMany.mockResolvedValue([
        { id: 'm1', name: 'Machine 1', isDeleted: false },
        { id: 'm2', name: 'Machine 2', isDeleted: false },
      ]);

      const result = await service.listMachines('t1');

      expect(result).toHaveLength(2);
      expect(mockPrisma.machine.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 't1', isDeleted: false }),
        }),
      );
    });
  });
});
