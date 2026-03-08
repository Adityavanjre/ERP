import { Test, TestingModule } from '@nestjs/testing';
import { LogisticsService } from './logistics.service';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../accounting/services/ledger.service';
import { TraceService } from '../common/services/trace.service';
import { BadRequestException } from '@nestjs/common';

describe('LogisticsService', () => {
  let service: LogisticsService;

  const mockPrisma = {
    tenant: {
      findUnique: jest.fn(),
    },
    vehicle: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    fuelLog: {
      create: jest.fn(),
    },
    trip: {
      create: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrisma)),
  };

  const mockLedger = {
    createJournalEntry: jest.fn(),
  };

  const mockTrace = {
    getCorrelationId: jest.fn().mockReturnValue('test-trace-id'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogisticsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LedgerService, useValue: mockLedger },
        { provide: TraceService, useValue: mockTrace },
      ],
    }).compile();

    service = module.get<LogisticsService>(LogisticsService);
  });

  describe('registerVehicle', () => {
    it('should throw BadRequestException for restricted verticals', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't1',
        type: 'Retail',
        governanceProfile: null,
      });

      await expect(
        service.registerVehicle('t1', { registrationNo: '12345' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.registerVehicle('t1', { registrationNo: '12345' }),
      ).rejects.toThrow(/Vertical Compliance Violation/);
    });

    it('should throw BadRequestException for invalid registration format', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't1',
        type: 'Logistics',
        governanceProfile: null,
      });

      await expect(
        service.registerVehicle('t1', { registrationNo: '123' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.registerVehicle('t1', { registrationNo: '123' }),
      ).rejects.toThrow(/Invalid registration number/);
    });

    it('should register a vehicle if parameters are met', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't1',
        type: 'Logistics',
        governanceProfile: null,
      });
      mockPrisma.vehicle.create.mockResolvedValue({
        registrationNo: 'MH12AB1234',
      });

      const result = await service.registerVehicle('t1', {
        registrationNo: 'MH12AB1234',
        model: 'TruckX',
        type: 'Heavy',
        capacity: 10000,
      });
      expect(result.registrationNo).toBe('MH12AB1234');
    });
  });

  describe('logFuel', () => {
    it('should calculate fuel cost accurately and trace correlation properly', async () => {
      mockLedger.createJournalEntry.mockResolvedValue({ id: 'je-1' });
      mockPrisma.fuelLog.create.mockResolvedValue({ id: 'fl-1' });

      await service.logFuel('t1', {
        vehicleId: 'v1',
        liters: 10,
        rate: 85.5,
        odometerReading: 12500,
        fuelAccountId: 'acc1',
        bankAccountId: 'acc2',
      });

      expect(mockLedger.createJournalEntry).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({
          transactions: expect.arrayContaining([
            expect.objectContaining({ amount: 855 }),
          ]),
        }),
        mockPrisma,
      );

      expect(mockPrisma.vehicle.update).toHaveBeenCalledWith({
        where: { id: 'v1' },
        data: { lastCurrentKM: 12500 },
      });
    });
  });
});
