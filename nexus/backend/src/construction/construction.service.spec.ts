import { Test, TestingModule } from '@nestjs/testing';
import { ConstructionService } from './construction.service';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../accounting/services/ledger.service';
import { TraceService } from '../common/services/trace.service';
import { BadRequestException } from '@nestjs/common';
import { TransactionType } from '@prisma/client';

describe('ConstructionService', () => {
    let service: ConstructionService;

    const mockPrisma = {
        bOQ: {
            create: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
        },
        bOQItem: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        siteInventory: {
            upsert: jest.fn(),
        },
        project: {
            findUnique: jest.fn(),
        },
        retentionSchedule: {
            createMany: jest.fn(),
            findMany: jest.fn(),
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
                ConstructionService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: LedgerService, useValue: mockLedger },
                { provide: TraceService, useValue: mockTrace },
            ],
        }).compile();

        service = module.get<ConstructionService>(ConstructionService);
    });

    describe('updateBOQStatus', () => {
        it('should throw BadRequestException for invalid transition', async () => {
            mockPrisma.bOQ.findUnique.mockResolvedValue({ id: 'boq-1', status: 'Approved', tenantId: 't1' });
            await expect(service.updateBOQStatus('t1', 'boq-1', 'Draft')).rejects.toThrow(BadRequestException);
            await expect(service.updateBOQStatus('t1', 'boq-1', 'Draft')).rejects.toThrow(/Invalid status transition/);
        });

        it('should update BOQ status for valid transition', async () => {
            mockPrisma.bOQ.findUnique.mockResolvedValue({ id: 'boq-1', status: 'Draft', tenantId: 't1' });
            mockPrisma.bOQ.update.mockResolvedValue({ id: 'boq-1', status: 'UnderReview' });
            const result = await service.updateBOQStatus('t1', 'boq-1', 'UnderReview');
            expect(result.status).toBe('UnderReview');
        });
    });

    describe('generateRABill', () => {
        it('should throw if no approved BOQ exists', async () => {
            mockPrisma.project.findUnique.mockResolvedValue({ id: 'proj-1', name: 'Proj 1', tenantId: 't1' });
            mockPrisma.bOQ.findFirst.mockResolvedValue(null);

            await expect(
                service.generateRABill('t1', 'proj-1', {
                    reference: 'RA-01',
                    certifiedAmount: 100000,
                    arAccountId: 'acc1',
                    revenueAccountId: 'acc2',
                    retentionAccountId: 'acc3',
                }),
            ).rejects.toThrow(/No Approved BOQ found/);
        });

        it('should complete RA billing transactions and retention schedule', async () => {
            mockPrisma.project.findUnique.mockResolvedValue({ id: 'proj-1', name: 'Proj 1', tenantId: 't1' });
            mockPrisma.bOQ.findFirst.mockResolvedValue({ id: 'boq-1', status: 'Approved' });
            mockLedger.createJournalEntry.mockResolvedValue({ id: 'je-1' });

            const result = await service.generateRABill('t1', 'proj-1', {
                reference: 'RA-01',
                certifiedAmount: 100000,
                retentionRate: 5,
                advanceRecoveryRate: 10,
                arAccountId: 'acc1',
                revenueAccountId: 'acc2',
                retentionAccountId: 'acc3',
                advanceRecoveryAccountId: 'acc4',
            });

            expect(result.netPayable).toBe('85000.00'); // 100000 - 5000 - 10000
            expect(result.retention).toBe('5000.00');
            expect(result.recovery).toBe('10000.00');
            expect(mockLedger.createJournalEntry).toHaveBeenCalled();
            expect(mockPrisma.retentionSchedule.createMany).toHaveBeenCalled();
        });
    });
});
