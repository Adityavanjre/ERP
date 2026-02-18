import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerStatus } from '@prisma/client';
import { AuditService } from '../system/services/audit.service';

@Injectable()
export class CrmService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async createCustomer(tenantId: string, data: any) {
    const { openingBalance, ...customerData } = data;

    if (customerData.firstName && customerData.firstName.trim().length < 3) {
      throw new Error(
        'Customer First Name must be at least 3 characters to maintain data quality.',
      );
    }

    if (customerData.phone && customerData.phone !== '0000000000') {
      const existing = await this.prisma.customer.findFirst({
        where: { tenantId, phone: customerData.phone, isDeleted: false },
      });
      if (existing) {
        throw new Error(
          `Customer with phone ${customerData.phone} already exists (${existing.firstName} ${existing.lastName || ''}).`,
        );
      }
    }

    const customer = await this.prisma.customer.create({
      data: {
        ...customerData,
        tenantId,
      },
    });

    if (openingBalance && Number(openingBalance) !== 0) {
      await this.prisma.customerOpeningBalance.create({
        data: {
          tenantId,
          customerId: customer.id,
          amount: Number(openingBalance),
          description: 'Opening Balance Migration',
          date: new Date(),
        },
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
    await this.ensureWalkInCustomer(tenantId);
    const skip = (page - 1) * limit;

    // Optimized query with pagination
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

        return {
          ...c,
          receivable: invoiceReceivable + openingBal,
        };
      }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Survival Feature: Bulk Import
  async importCustomers(tenantId: string, csvContent: string) {
    const rows = csvContent.split('\n');
    const headers = rows[0].split(',').map((h) => h.trim());

    const results = {
      total: rows.length - 1,
      imported: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row.trim()) continue;

      const cols = row.split(',').map((c) => c.trim());

      const firstNameIdx = headers.indexOf('firstName');
      const lastNameIdx = headers.indexOf('lastName');
      const emailIdx = headers.indexOf('email');
      const phoneIdx = headers.indexOf('phone');
      const companyIdx = headers.indexOf('company');
      const streetIdx = headers.indexOf('address');
      const stateIdx = headers.indexOf('state');
      const gstinIdx = headers.indexOf('gstin');
      const openingIdx = headers.indexOf('openingBalance');

      if (firstNameIdx === -1 || emailIdx === -1) {
        results.failed++;
        results.errors.push(
          `Row ${i}: Missing required columns (firstName, email)`,
        );
        continue;
      }

      const firstName = cols[firstNameIdx];
      const lastName = lastNameIdx > -1 ? cols[lastNameIdx] : '';
      const email = cols[emailIdx];
      const phone = phoneIdx > -1 ? cols[phoneIdx] : '';
      const company = companyIdx > -1 ? cols[companyIdx] : '';
      const address = streetIdx > -1 ? cols[streetIdx] : '';
      const state = stateIdx > -1 ? cols[stateIdx] : null; // Critical for GST
      const gstin = gstinIdx > -1 ? cols[gstinIdx] : null;
      const openingBalance =
        openingIdx > -1 ? parseFloat(cols[openingIdx]) || 0 : 0;

      if (!firstName || !email) {
        results.failed++;
        results.errors.push(`Row ${i}: First Name and Email required`);
        continue;
      }

      if (gstin && !state) {
        results.errors.push(
          `Row ${i}: Warning - GSTIN provided but State missing. Tax logic may fail.`,
        );
      }

      try {
        // Check existing by email
        const existing = await this.prisma.customer.findFirst({
          where: { tenantId, email, isDeleted: false },
        });

        let customerId = existing?.id;

        if (existing) {
          await this.prisma.customer.updateMany({
            where: { id: existing.id, tenantId },
            data: {
              firstName,
              lastName,
              phone,
              company,
              address,
              state,
              gstin,
              status: CustomerStatus.Customer,
            },
          });
        } else {
          const newC = await this.prisma.customer.create({
            data: {
              tenantId,
              firstName,
              lastName,
              email,
              phone,
              company,
              address,
              state,
              gstin,
            },
          });
          customerId = newC.id;
        }

        // Handle Opening Balance (Add if not exists, simplistic logic)
        if (openingBalance !== 0 && customerId) {
          // Check if OB already exists to avoid duplication on re-import
          const existingOB = await this.prisma.customerOpeningBalance.findFirst(
            {
              where: { tenantId, customerId },
            },
          );

          if (!existingOB) {
            await this.prisma.customerOpeningBalance.create({
              data: {
                tenantId,
                customerId,
                amount: openingBalance,
                description: 'Imported Opening Balance',
                date: new Date(),
              },
            });
          } else {
            // Update existing OB
            await this.prisma.customerOpeningBalance.updateMany({
              where: { id: existingOB.id, tenantId },
              data: { amount: openingBalance },
            });
          }
        }

        results.imported++;
      } catch (e: any) {
        results.failed++;
        results.errors.push(`Row ${i}: ${e.message}`);
      }
    }
    return results;
  }

  async getStats(tenantId: string) {
    const totalCustomers = await this.prisma.customer.count({
      where: { tenantId },
    });
    const leads = await this.prisma.customer.count({
      where: { tenantId, status: CustomerStatus.Lead },
    });

    const pipeline = await this.prisma.opportunity.aggregate({
      where: { tenantId },
      _sum: { value: true },
      _count: true,
    });

    return {
      totalCustomers,
      leads,
      conversionRate:
        totalCustomers > 0
          ? ((totalCustomers - leads) / totalCustomers) * 100
          : 0,
      pipelineValue: pipeline._sum.value || 0,
      openDeals: pipeline._count,
    };
  }

  async deleteCustomer(tenantId: string, id: string) {
    const unpaidInvoices = await this.prisma.invoice.count({
      where: {
        tenantId,
        customerId: id,
        status: { in: ['Unpaid', 'Partial', 'Overdue'] },
      },
    });

    const customer = await this.prisma.customer.findFirst({ 
      where: { id, tenantId, isDeleted: false } 
    });
    if (customer?.email === 'walkin@system.local') {
      throw new Error("System protected 'Walk-In Customer' cannot be deleted.");
    }

    if (unpaidInvoices > 0) {
      throw new Error('Cannot delete customer with outstanding invoices.');
    }

    return this.prisma.customer.updateMany({
      where: { id, tenantId },
      data: { isDeleted: true },
    });
  }

  async updateCustomer(tenantId: string, id: string, data: any) {
    // Security check: ensure customer belongs to tenant
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId, isDeleted: false },
    });
    if (!customer) throw new Error('Customer not found');

    // Phone deduplication check if phone is changing
    if (data.phone && data.phone !== customer.phone && data.phone !== '0000000000') {
      const existing = await this.prisma.customer.findFirst({
        where: { tenantId, phone: data.phone, isDeleted: false },
      });
      if (existing) {
        throw new Error(`Another customer already has the phone number ${data.phone}.`);
      }
    }

    const { openingBalance, ...updateData } = data;

    const updated = await this.prisma.customer.update({
      where: { id },
      data: updateData,
    });

    await this.audit.log({
      tenantId,
      action: 'UPDATE_CUSTOMER',
      resource: 'Customer',
      details: { customerId: id, changes: updateData },
    });

    return updated;
  }

  // --- Opportunities ---
  async createOpportunity(tenantId: string, data: any) {
    return this.prisma.opportunity.create({
      data: {
        ...data,
        tenantId,
      },
      include: { customer: true },
    });
  }

  async getOpportunities(tenantId: string) {
    return this.prisma.opportunity.findMany({
      where: { tenantId },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateOpportunity(tenantId: string, id: string, data: any) {
    // Security check: ensure opportunity belongs to tenant
    const opp = await this.prisma.opportunity.findFirst({
      where: { id, tenantId },
    });
    if (!opp) throw new Error('Opportunity not found');

    return this.prisma.opportunity.updateMany({
      where: { id, tenantId },
      data,
    });
  }

  async exportCustomers(tenantId: string) {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'First Name,Last Name,Email,Phone,Company,GSTIN,State,Status\n';
    const rows = customers
      .map((c) => {
        return `"${c.firstName}","${c.lastName || ''}","${c.email}","${c.phone || ''}","${
          c.company || ''
        }","${c.gstin || ''}","${c.state || ''}","${c.status}"`;
      })
      .join('\n');

    return header + rows;
  }

  // --- Opening Balances ---
  async addOpeningBalance(tenantId: string, customerId: string, data: any) {
    const ob = await this.prisma.customerOpeningBalance.create({
      data: {
        ...data,
        tenantId,
        customerId,
      },
    });

    await this.audit.log({
      tenantId,
      action: 'ADD_OPENING_BALANCE',
      resource: 'Customer',
      details: { customerId, balanceId: ob.id, amount: ob.amount },
    });

    return ob;
  }

  async getOpeningBalances(tenantId: string, customerId: string) {
    return this.prisma.customerOpeningBalance.findMany({
      where: { tenantId, customerId },
      orderBy: { date: 'desc' },
    });
  }
}
