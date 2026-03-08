import { Test, TestingModule } from '@nestjs/testing';
import { HealthcareService } from './healthcare.service';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../accounting/services/ledger.service';
import { TraceService } from '../common/services/trace.service';

describe('HealthcareService', () => {
  let service: HealthcareService;

  const mockPrisma = {
    patient: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    customer: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    governanceProfile: {
      findUnique: jest.fn(),
    },
    medicalRecord: {
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
        HealthcareService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LedgerService, useValue: mockLedger },
        { provide: TraceService, useValue: mockTrace },
      ],
    }).compile();

    service = module.get<HealthcareService>(HealthcareService);
  });

  describe('createMedicalRecord and Triage', () => {
    it('should assign Critical triage status based on lab results', async () => {
      mockPrisma.governanceProfile.findUnique.mockResolvedValue({
        criticalPotassium: 6.0,
        criticalHemoglobin: 7.0,
        criticalGlucose: 500,
      });

      mockPrisma.medicalRecord.create.mockImplementation((args) => args.data);

      const result = await service.createMedicalRecord('t1', {
        patientId: 'p1',
        diagnosis: 'Checkup',
        labResults: { potassium: 6.5, hemoglobin: 12, glucose: 100 },
      });

      expect(result.triageStatus).toBe('Critical');
    });

    it('should assign Warning triage status based on lab results', async () => {
      mockPrisma.governanceProfile.findUnique.mockResolvedValue({
        warningPotassium: 5.2,
        warningHemoglobin: 10.0,
        warningGlucose: 200,
        criticalPotassium: 6.0,
        criticalHemoglobin: 7.0,
        criticalGlucose: 500,
      });

      mockPrisma.medicalRecord.create.mockImplementation((args) => args.data);

      const result = await service.createMedicalRecord('t1', {
        patientId: 'p1',
        diagnosis: 'Checkup',
        labResults: { potassium: 5.5, hemoglobin: 12, glucose: 100 },
      });

      expect(result.triageStatus).toBe('Warning');
    });
  });

  describe('generateInsuranceClaimInvoice', () => {
    it('should route patient ledger correctly', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue({
        id: 'p1',
        customerId: 'c1',
      });
      mockLedger.createJournalEntry.mockResolvedValue({ id: 'je-1' });

      const result = await service.generateInsuranceClaimInvoice('t1', {
        patientId: 'p1',
        totalBill: 10000,
        coPayAmount: 2000,
        insuranceProviderId: 'ins-1',
        arAccountId: 'acc1',
        insuranceReceivableAccountId: 'acc2',
        revenueAccountId: 'acc3',
      });

      expect(result.insuranceClaim).toBe('8000.00');
      expect(mockLedger.createJournalEntry).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({
          transactions: expect.arrayContaining([
            expect.objectContaining({ accountId: 'acc1', amount: 2000 }), // Co-Pay (Patient AR)
            expect.objectContaining({ accountId: 'acc2', amount: 8000 }), // Insurance AR
          ]),
        }),
        mockPrisma,
      );
    });
  });
});
