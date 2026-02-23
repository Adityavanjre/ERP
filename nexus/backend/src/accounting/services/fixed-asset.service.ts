import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AssetStatus, AccountType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { LedgerService } from './ledger.service';
import { StandardAccounts } from '../constants/account-names';

@Injectable()
export class FixedAssetService {
    constructor(
        private prisma: PrismaService,
        private ledger: LedgerService,
    ) { }

    async create(tenantId: string, data: any) {
        const { name, assetCode, purchaseDate, purchaseValue, salvageValue, usefulLife, idempotencyKey } = data;

        return this.prisma.$transaction(async (tx) => {
            if (idempotencyKey) {
                const existing = await (tx.fixedAsset as any).findFirst({
                    where: { tenantId, idempotencyKey }
                });
                if (existing) return existing;
            }

            await this.ledger.checkPeriodLock(tenantId, new Date(purchaseDate), tx);

            const asset = await tx.fixedAsset.create({
                data: {
                    tenantId,
                    name,
                    assetCode,
                    purchaseDate: new Date(purchaseDate),
                    purchaseValue: new Decimal(purchaseValue),
                    salvageValue: new Decimal(salvageValue || 0),
                    usefulLife: parseInt(usefulLife),
                    idempotencyKey,
                    status: AssetStatus.Active,
                    accumulatedDepreciation: new Decimal(0),
                } as any
            });


            // Accounting Impact: Dr Fixed Assets / Cr Bank or Accounts Payable
            // For now, we assume it's recorded against Bank (standard for capital purchases)
            const assetAcc = await tx.account.findFirst({ where: { tenantId, name: StandardAccounts.FIXED_ASSETS } });
            const bankAcc = await tx.account.findFirst({ where: { tenantId, name: StandardAccounts.BANK } });

            if (assetAcc && bankAcc) {
                await this.ledger.createJournalEntry(tenantId, {
                    date: new Date(purchaseDate).toISOString(),
                    description: `Acquisition of Fixed Asset: ${name} (${assetCode})`,
                    reference: assetCode,
                    transactions: [
                        { accountId: assetAcc.id, type: 'Debit', amount: new Decimal(purchaseValue).toNumber(), description: 'Asset Acquisition' },
                        { accountId: bankAcc.id, type: 'Credit', amount: new Decimal(purchaseValue).toNumber(), description: 'Asset Acquisition' },
                    ]
                }, tx);
            }

            return asset;
        });
    }

    async findAll(tenantId: string) {
        return this.prisma.fixedAsset.findMany({
            where: { tenantId },
            include: { depreciationLogs: true } as any,
            orderBy: { purchaseDate: 'desc' }
        });
    }


    async runMonthlyDepreciation(tenantId: string, assetId: string) {
        return this.prisma.$transaction(async (tx) => {
            const asset = await tx.fixedAsset.findUnique({
                where: { id: assetId }
            });

            if (!asset || asset.tenantId !== tenantId) {
                throw new NotFoundException('Asset not found');
            }

            if (asset.status !== AssetStatus.Active) {
                throw new BadRequestException(`Asset is not active (${asset.status})`);
            }

            // 1. Calculate Monthly Depreciation (Straight Line Method)
            // Formula: (Purchase Value - Salvage Value) / Useful Life (months)
            const cost = new Decimal(asset.purchaseValue as any);
            const salvage = new Decimal(asset.salvageValue as any);
            const life = new Decimal(asset.usefulLife);

            const monthlyDep = this.ledger.round2(cost.sub(salvage).div(life));

            // 2. Check if we've already reached salvage value
            const currentAccDep = new Decimal(asset.accumulatedDepreciation as any);
            const remainingLife = cost.sub(salvage).sub(currentAccDep);

            if (remainingLife.lessThanOrEqualTo(0)) {
                await tx.fixedAsset.update({
                    where: { id: assetId },
                    data: { status: AssetStatus.FullyDepreciated }
                });
                throw new BadRequestException('Asset is already fully depreciated');
            }

            const actualDepAmount = Decimal.min(monthlyDep, remainingLife);

            // 3. Post Journal Entry: Dr Depreciation Expense / Cr Accumulated Depreciation
            const depExpAcc = await tx.account.findFirst({ where: { tenantId, name: StandardAccounts.DEPRECIATION_EXPENSE } });
            const accDepAcc = await tx.account.findFirst({ where: { tenantId, name: StandardAccounts.ACCUMULATED_DEPRECIATION } });

            if (!depExpAcc || !accDepAcc) {
                throw new BadRequestException('Compliance Error: Depreciation accounts missing. Please initialize COA.');
            }

            const journalId = await this.ledger.createJournalEntry(tenantId, {
                date: new Date().toISOString(),
                description: `Monthly Depreciation: ${asset.name}`,
                reference: `DEP-${asset.assetCode}-${new Date().toISOString().slice(0, 7)}`,
                transactions: [
                    { accountId: depExpAcc.id, type: 'Debit', amount: actualDepAmount.toNumber(), description: 'Depreciation Charge' },
                    { accountId: accDepAcc.id, type: 'Credit', amount: actualDepAmount.toNumber(), description: 'Accumulated Depreciation' },
                ]
            }, tx);

            // 4. Update Asset
            const newAccDep = currentAccDep.add(actualDepAmount);
            const isFullyDepreciated = newAccDep.greaterThanOrEqualTo(cost.sub(salvage));

            await tx.fixedAsset.update({
                where: { id: assetId },
                data: {
                    accumulatedDepreciation: newAccDep,
                    status: isFullyDepreciated ? AssetStatus.FullyDepreciated : AssetStatus.Active
                }
            });

            // 5. Log activity
            await (tx as any).depreciationLog.create({
                data: {
                    tenantId,
                    assetId,
                    amount: actualDepAmount,
                    description: `Monthly Depreciation for ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
                    journalEntryId: (journalId as any).id
                }
            });



            return {
                assetId,
                monthlyDepreciation: actualDepAmount,
                totalAccumulated: newAccDep,
                fullyDepreciated: isFullyDepreciated
            };
        });
    }
}
