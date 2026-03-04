import { Test, TestingModule } from '@nestjs/testing';
import { NbfcService } from './nbfc.service';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../accounting/services/ledger.service';
import { TraceService } from '../common/services/trace.service';
import { BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('NbfcService', () => {
    let service: NbfcService;

    const mockPrisma = {
        loan: {
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn()
        },
        kYCRecord: {
            findUnique: jest.fn()
        },
        $transaction: jest.fn((cb) => cb(mockPrisma)),
    };

    const mockLedger = {
        createJournalEntry: jest.fn()
    };

    const mockTrace = {
        getCorrelationId: jest.fn().mockReturnValue('test-trace-id')
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NbfcService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: LedgerService, useValue: mockLedger },
                { provide: TraceService, useValue: mockTrace }
            ],
        }).compile();

        service = module.get<NbfcService>(NbfcService);
    });

    describe('disburseLoan', () => {
        it('should throw BadRequestException if loan does not exist', async () => {
            mockPrisma.loan.findUnique.mockResolvedValue(null);
            await expect(service.disburseLoan('tenant-1', 'loan-1', { bankAccountId: 'acc1', loanAssetAccountId: 'acc2' }))
                .rejects.toThrow(BadRequestException);
            await expect(service.disburseLoan('tenant-1', 'loan-1', { bankAccountId: 'acc1', loanAssetAccountId: 'acc2' }))
                .rejects.toThrow('Loan not found');
        });

        it('should throw BadRequestException if loan is not approved', async () => {
            mockPrisma.loan.findUnique.mockResolvedValue({ id: 'loan-1', status: 'Applied', tenantId: 'tenant-1' });
            await expect(service.disburseLoan('tenant-1', 'loan-1', { bankAccountId: 'acc1', loanAssetAccountId: 'acc2' }))
                .rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException if KYC is not verified', async () => {
            mockPrisma.loan.findUnique.mockResolvedValue({ id: 'loan-1', status: 'Approved', tenantId: 'tenant-1' });
            mockPrisma.kYCRecord.findUnique.mockResolvedValue({ verificationStatus: 'Pending' });

            await expect(service.disburseLoan('tenant-1', 'loan-1', { bankAccountId: 'acc1', loanAssetAccountId: 'acc2' }))
                .rejects.toThrow('KYC must be verified before loan disbursement');
        });
    });

    describe('applyForLoan', () => {
        it('should create loan and trace it', async () => {
            mockPrisma.loan.create.mockResolvedValue({ id: 'l1', status: 'Applied' });
            const result = await service.applyForLoan('t1', { borrowerId: 'b1', loanAmount: 100, interestRate: 10, tenureMonths: 12, startDate: '2023-01-01' });
            expect(result.status).toBe('Applied');
            expect(mockPrisma.loan.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    correlationId: 'test-trace-id'
                })
            }));
        });
    });
});
