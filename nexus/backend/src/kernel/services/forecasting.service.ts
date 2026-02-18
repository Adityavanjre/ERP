import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ForecastingService {
  private readonly logger = new Logger(ForecastingService.name);

  constructor(private prisma: PrismaService) {}

  async getCashflowForecast(tenantId: string, days: number = 30) {
    const today = new Date();
    const horizon = new Date();
    horizon.setDate(today.getDate() + days);

    // 1. Get average settlement lag per customer
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, isDeleted: false },
      include: {
        invoices: {
          where: { status: 'Paid' },
          select: { issueDate: true, payments: { select: { date: true, amount: true } } },
        },
      },
    });

    const settlementMapping = new Map<string, number>();
    const DEFAULT_LAG = 15 * 24 * 60 * 60 * 1000;

    for (const customer of customers) {
      const paidInvoices = customer.invoices.filter(inv => inv.payments.length > 0);
      if (paidInvoices.length > 0) {
        const totalLag = paidInvoices.reduce((sum, inv) => {
          const firstPaymentDate = inv.payments[0].date;
          return sum + Math.max(0, firstPaymentDate.getTime() - inv.issueDate.getTime());
        }, 0);
        settlementMapping.set(customer.id, totalLag / paidInvoices.length);
      } else {
        settlementMapping.set(customer.id, DEFAULT_LAG);
      }
    }

    // 2. Project outstanding invoices
    const outstandingInvoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: { in: ['Unpaid', 'Partial'] },
        issueDate: { lte: horizon }
      },
      include: { customer: true },
    });

    if (outstandingInvoices.length === 0) {
      return {
        projections: [],
        dailyData: [],
        totalExpected: 0,
        insight: 'No outstanding invoices within forecast horizon.'
      };
    }

    const projections = outstandingInvoices.map(inv => {
      const customerId = inv.customerId || 'UNKNOWN';
      const avgLag = settlementMapping.get(customerId) || DEFAULT_LAG;
      const expectedDate = new Date(inv.issueDate.getTime() + avgLag);
      
      return {
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer?.company || inv.customer?.firstName || 'Walk-in',
        amount: Math.max(0, Number(inv.totalAmount) - Number(inv.amountPaid)),
        expectedDate,
        probability: this.calculateProbability(inv.issueDate, expectedDate, today),
      };
    });

    // 3. Group by date for chart data
    const dailyForecast = new Map<string, number>();
    for (const proj of projections) {
      if (proj.expectedDate <= horizon) {
        const dateKey = proj.expectedDate.toISOString().split('T')[0];
        dailyForecast.set(dateKey, (dailyForecast.get(dateKey) || 0) + proj.amount);
      }
    }

    return {
      projections: projections.sort((a, b) => a.expectedDate.getTime() - b.expectedDate.getTime()),
      dailyData: Array.from(dailyForecast.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      totalExpected: projections.reduce((sum, p) => sum + p.amount, 0),
    };
  }

  private calculateProbability(issueDate: Date, expectedDate: Date, today: Date): number {
    const totalDuration = expectedDate.getTime() - issueDate.getTime();
    const elapsed = today.getTime() - issueDate.getTime();
    
    if (elapsed > totalDuration) return 30; // Overdue items have lower immediate probability
    const ratio = elapsed / totalDuration;
    return Math.min(95, 50 + (ratio * 40)); // Probability increases as we approach expected date
  }
}
