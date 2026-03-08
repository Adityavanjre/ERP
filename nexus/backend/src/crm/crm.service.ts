import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerStatus } from '@prisma/client';
import { AuditService } from '../system/services/audit.service';
import { LedgerService } from '../accounting/services/ledger.service';
import { AccountType } from '@prisma/client';
import { objectsToSafeCsv } from '../common/utils/csv-sanitize.util';

@Injectable()
export class CrmService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private ledger: LedgerService,
  ) {}

  async createCustomer(tenantId: string, data: any) {
    const { openingBalance, ...customerData } = data;

    if (customerData.firstName && customerData.firstName.trim().length < 3) {
      throw new BadRequestException(
        'Customer First Name must be at least 3 characters.',
      );
    }

    const customer = await this.prisma.customer.create({
      data: { ...customerData, tenantId },
    });

    if (openingBalance && Number(openingBalance) !== 0) {
      await this.addOpeningBalance(tenantId, customer.id, {
        amount: Number(openingBalance),
        description: 'Opening Balance Migration',
        date: new Date(),
      });
    }

    return customer;
  }

  async ensureWalkInCustomer(tenantId: string) {
    let walkIn = await this.prisma.customer.findFirst({
      where: { tenantId, email: 'walkin@system.local' },
    });

    if (!walkIn) {
      walkIn = await this.prisma.customer.create({
        data: {
          tenantId,
          firstName: 'Walk-In',
          lastName: 'Customer',
          email: 'walkin@system.local',
          phone: '0000000000',
          company: 'Cash Counter',
          status: CustomerStatus.Customer,
        },
      });
    }
    return walkIn;
  }

  async getCustomers(tenantId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where: { tenantId, isDeleted: false },
        include: {
          invoices: {
            where: { status: { in: ['Unpaid', 'Partial', 'Overdue'] } },
            select: { totalAmount: true, amountPaid: true },
          },
          openingBalances: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: skip,
      }),
      this.prisma.customer.count({ where: { tenantId, isDeleted: false } }),
    ]);

    return {
      data: (customers as any[]).map((c) => {
        const invoiceReceivable = (c.invoices || []).reduce(
          (sum: number, inv: any) =>
            sum + (Number(inv.totalAmount) - Number(inv.amountPaid)),
          0,
        );
        const openingBal = (c.openingBalances || []).reduce(
          (sum: number, ob: any) => sum + Number(ob.amount),
          0,
        );
        return { ...c, receivable: invoiceReceivable + openingBal };
      }),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Survival Feature: Bulk Import with Accounting Sync
   * Rule: No invisible wealth. Every imported balance must hit the GL.
   */
  async importCustomers(tenantId: string, csvContent: string) {
    const rows = csvContent.split('\n');
    const headers = rows[0].split(',').map((h) => h.trim());

    const results = {
      total: rows.length - 1,
      imported: 0,
      failed: 0,
      errors: [] as string[],
    };

    let aggregateOpeningBalance = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row.trim()) continue;

      const cols = row.split(',').map((c) => c.trim());
      const data: any = {};
      headers.forEach((h, idx) => {
        data[h] = cols[idx];
      });

      try {
        await this.prisma.$transaction(async (tx) => {
          const email = data.email;
          if (!email) throw new Error('Email is required');

          const existing = await tx.customer.findFirst({
            where: { tenantId, email, isDeleted: false },
          });

          let customerId = existing?.id;
          const customerPayload = {
            firstName: data.firstName || 'Customer',
            lastName: data.lastName || '',
            phone: data.phone || '',
            company: data.company || '',
            address: data.address || '',
            state: data.state || null,
            gstin: data.gstin || null,
            status: CustomerStatus.Customer,
          };

          if (existing) {
            await tx.customer.update({
              where: { id: existing.id },
              data: customerPayload,
            });
          } else {
            const newC = await tx.customer.create({
              data: { ...customerPayload, tenantId, email },
            });
            customerId = newC.id;
          }

          const ob = parseFloat(data.openingBalance) || 0;
          if (ob !== 0 && customerId) {
            const existingOB = await tx.customerOpeningBalance.findFirst({
              where: { tenantId, customerId },
            });
            if (!existingOB) {
              await tx.customerOpeningBalance.create({
                data: {
                  tenantId,
                  customerId,
                  amount: ob,
                  description: 'Imported',
                  date: new Date(),
                },
              });
              aggregateOpeningBalance += ob;
            }
          }
        });
        results.imported++;
      } catch (e: any) {
        results.failed++;
        results.errors.push(`Row ${i}: ${e.message}`);
      }
    }

    // Ledger Sync: Restore balance sheet integrity
    if (aggregateOpeningBalance !== 0) {
      const arAcc = await this.prisma.account.findFirst({
        where: { tenantId, name: 'Accounts Receivable' },
      });
      const obAcc = await this.prisma.account.findFirst({
        where: { tenantId, name: 'Opening Balance Equity' },
      });

      if (arAcc && obAcc) {
        await this.ledger.createJournalEntry(tenantId, {
          date: new Date().toISOString(),
          description: `Bulk Import Sync: ${results.imported} Customers`,
          reference: 'SYS-IMPORT-CUST',
          transactions: [
            {
              accountId: arAcc.id,
              type: 'Debit',
              amount: Math.abs(aggregateOpeningBalance),
              description: 'Bulk OB',
            },
            {
              accountId: obAcc.id,
              type: 'Credit',
              amount: Math.abs(aggregateOpeningBalance),
              description: 'Bulk OB',
            },
          ],
        });
      }
    }

    return results;
  }

  async getStats(tenantId: string) {
    const totalCustomers = await this.prisma.customer.count({
      where: { tenantId, isDeleted: false },
    });
    const leads = await this.prisma.customer.count({
      where: { tenantId, status: CustomerStatus.Lead, isDeleted: false },
    });
    return { totalCustomers, leads };
  }

  async deleteCustomer(tenantId: string, id: string) {
    return this.prisma.customer.updateMany({
      where: { id, tenantId },
      data: { isDeleted: true },
    });
  }

  async updateCustomer(tenantId: string, id: string, data: any) {
    return this.prisma.customer.update({
      where: { id, tenantId },
      data,
    });
  }

  async exportCustomers(tenantId: string) {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, isDeleted: false },
      take: 50000,
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'company',
      'status',
    ];
    const exportData = customers.map((c: any) => {
      const row: any = {};
      headers.forEach((h) => (row[h] = c[h] || ''));
      return row;
    });

    return objectsToSafeCsv(exportData);
  }

  async createOpportunity(tenantId: string, data: any) {
    return this.prisma.opportunity.create({
      data: { ...data, tenantId },
    });
  }

  async getOpportunities(tenantId: string) {
    return this.prisma.opportunity.findMany({
      where: { tenantId },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async updateOpportunity(tenantId: string, id: string, data: any) {
    return this.prisma.opportunity.update({
      where: { id, tenantId },
      data,
    });
  }

  async addOpeningBalance(tenantId: string, customerId: string, data: any) {
    return this.prisma.$transaction(async (tx) => {
      const ob = await tx.customerOpeningBalance.create({
        data: { ...data, tenantId, customerId },
      });

      const arAcc = await tx.account.findFirst({
        where: { tenantId, name: 'Accounts Receivable' },
      });
      const obAcc = await tx.account.findFirst({
        where: { tenantId, name: 'Opening Balance Equity' },
      });

      if (arAcc && obAcc) {
        await this.ledger.createJournalEntry(
          tenantId,
          {
            date: new Date().toISOString(),
            description: 'Opening Balance Adjustment',
            reference: `OB-${ob.id.slice(0, 8)}`,
            transactions: [
              {
                accountId: arAcc.id,
                type: 'Debit',
                amount: Math.abs(Number(ob.amount)),
                description: 'Customer OB',
              },
              {
                accountId: obAcc.id,
                type: 'Credit',
                amount: Math.abs(Number(ob.amount)),
                description: 'Customer OB',
              },
            ],
          },
          tx,
        );
      }
      return ob;
    });
  }

  async getOpeningBalances(tenantId: string, customerId: string) {
    return this.prisma.customerOpeningBalance.findMany({
      where: { tenantId, customerId },
      take: 100,
    });
  }
}
