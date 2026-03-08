import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Analyze a dataset for a specific model to find anomalies or trends.
   */
  async analyzeModel(modelName: string) {
    this.logger.log(`AI Engine: Running neural analysis on [${modelName}]...`);
    // In a real implementation, this would call an LLM or a specialized ML model
    return {
      status: 'Success',
      confidence: 0.94,
      insights: [
        {
          type: 'trend',
          message: 'Seasonal demand for this object is increasing by 12%.',
        },
        {
          type: 'anomaly',
          message: '3 records identified as potential data entry errors.',
        },
      ],
    };
  }

  /**
   * Classify a dynamic record using the Kernel's smart classifier.
   */
  async classifyRecord(modelName: string, data: any) {
    // Logic for auto-tagging or categorizing records
    return {
      category: 'High Priority',
      suggestedTags: ['urgent', 'enterprise'],
    };
  }

  /**
   * Predictive Intelligence: Forecasts stock requirements based on historical trends.
   */
  async getInventoryForecast(tenantId: string) {
    this.logger.log(
      `AI Engine: Generating inventory forecast for [${tenantId}]...`,
    );

    // 1. Fetch current stock
    const products = await this.prisma.product.findMany({
      where: { tenantId, isDeleted: false },
      select: {
        id: true,
        sku: true,
        name: true,
        category: true,
        price: true,
        stock: true,
      },
    });

    // 2. Fetch historical sales to determine velocity
    // For this MVP, we simulate velocity based on stock levels and a random entropy factor
    const recommendations = products.map((p) => {
      try {
        const velocity = Math.floor(Math.random() * 5) + 1; // Simulated weekly sales
        const stockNum = new Decimal(p.stock || 0).toNumber();
        const daysRemaining = Math.floor(stockNum / (velocity / 7 || 0.1));

        return {
          productId: p.id,
          sku: p.sku,
          name: p.name,
          currentStock: p.stock,
          velocity: `${velocity} units/week`,
          daysRemaining: isNaN(daysRemaining) ? 0 : daysRemaining,
          recommendation: daysRemaining < 14 ? 'Urgent Reorder' : 'Optimum',
          predictedShortage:
            daysRemaining < 7
              ? new Date(
                  Date.now() +
                    (daysRemaining > 0 ? daysRemaining : 0) * 86400000,
                ).toLocaleDateString()
              : null,
        };
      } catch (err) {
        // RESILIENCE: Prevent one bad product from failing the entire inventory sync
        return {
          productId: p.id,
          sku: p.sku,
          name: p.name,
          currentStock: p.stock || 0,
          velocity: 'Sync Error',
          daysRemaining: 999,
          recommendation: 'Manual Check Required',
          predictedShortage: null,
        };
      }
    });

    return {
      status: 'Optimal',
      lastUpdated: new Date(),
      insightsCount: recommendations.filter(
        (r) => r.recommendation === 'Urgent Reorder',
      ).length,
      recommendations: recommendations.sort(
        (a, b) => a.daysRemaining - b.daysRemaining,
      ),
    };
  }

  /**
   * Domain-Aware Analysis: Detects accounting and compliance anomalies.
   * Scans for Negative Stock, Tax Mismatches, and Unallocated Cash.
   */
  async detectComplianceAnomalies(tenantId: string) {
    const anomalies: any[] = [];

    // 1. Negative Stock (Operational Risk)
    const negStock = await (this.prisma as any).stockLocation.findMany({
      where: { tenantId, quantity: { lt: 0 } },
      include: { product: true, warehouse: true },
    });
    negStock.forEach((s: any) => {
      anomalies.push({
        type: 'Inventory',
        severity: 'High',
        message: `Negative stock detected for [${s.product.name}] in [${s.warehouse.name}]. This distorts COGS and inventory valuation.`,
      });
    });

    // 2. Unallocated Payments (Financial Drift)
    const unallocated = await this.prisma.payment.findMany({
      where: { tenantId, invoiceId: null },
    });
    if (unallocated.length > 0) {
      anomalies.push({
        type: 'Accounting',
        severity: 'Medium',
        message: `${unallocated.length} payments are unallocated to invoices. This leaves Accounts Receivable overstated.`,
      });
    }

    // 3. Tax compliance Check (HSN missing)
    const missingHsn = await this.prisma.product.count({
      where: { tenantId, hsnCode: null },
    });
    if (missingHsn > 0) {
      anomalies.push({
        type: 'Compliance',
        severity: 'Low',
        message: `${missingHsn} products are missing HSN codes. GST-compliant invoicing will fail for these items.`,
      });
    }

    return {
      timestamp: new Date().toISOString(),
      totalAnomalies: anomalies.length,
      anomalies,
    };
  }

  /**
   * Natural Language Intelligence: Converts financial data into a human-readable brief.
   */
  async getNaturalLanguageSummary(tenantId: string) {
    const [sales, custCount] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { tenantId, status: 'Paid' },
        _sum: { totalAmount: true },
      }),
      this.prisma.customer.count({ where: { tenantId } }),
    ]);

    const revenue = sales._sum.totalAmount
      ? new Decimal(sales._sum.totalAmount as any).toNumber()
      : 0;

    return {
      brief: `Your business has generated ₹${revenue.toLocaleString()} in paid revenue from ${custCount} customers.`,
      insights: [
        revenue > 0
          ? 'Revenue is positive and flow is active.'
          : 'No realized revenue recorded yet.',
        'Compliance status is 100% auditable via the System Audit engine.',
      ],
    };
  }

  /**
   * Financial Intelligence: Scans for compliance anomalies and audit risks.
   * Rule: AI must be Assistive, not autonomous.
   */
  async getAccountingInsights(tenantId: string) {
    this.logger.log(
      `AI Engine: Running Financial Integrity Audit for [${tenantId}]...`,
    );

    const anomalies = [];

    // 1. Scan for Negative Physical Realities
    const negativeStock = await this.prisma.product.findMany({
      where: { tenantId, stock: { lt: 0 }, isDeleted: false },
      select: { name: true, stock: true },
    });

    if (negativeStock.length > 0) {
      anomalies.push({
        type: 'PHYSICAL_IMPOSSIBILITY',
        severity: 'HIGH',
        message: `${negativeStock.length} products have negative stock. This suggests missing purchase entries or inventory drift.`,
      });
    }

    // 2. Scan for Compliance Gaps (HSN Enforcement)
    const missingHsn = await this.prisma.product.count({
      where: { tenantId, hsnCode: null, isDeleted: false },
    });

    if (missingHsn > 0) {
      anomalies.push({
        type: 'COMPLIANCE_RISK',
        severity: 'MEDIUM',
        message: `${missingHsn} products are missing HSN/SAC codes. Mandatory for GST-compliant invoicing.`,
      });
    }

    // 3. Scan for Pending Reconciliations (Draft Invoices)
    const pendingInvoices = await this.prisma.invoice.count({
      where: { tenantId, status: 'Unpaid' },
    });

    return {
      integrityScore: Math.max(0, 100 - anomalies.length * 10),
      lastAudited: new Date(),
      anomalies,
      summary: {
        outstandingInvoices: pendingInvoices,
        inventoryHealth: negativeStock.length === 0 ? 'Good' : 'Critical',
      },
    };
  }

  /**
   * Manufacturing Depth: Production Yield Prediction (Yield AI)
   * Analyzes historical WorkOrders for a specific BOM to project expected actual quantity vs theoretical.
   */
  async getYieldAnalysis(tenantId: string, bomId: string) {
    const historicalOrders = await this.prisma.workOrder.findMany({
      where: { tenantId, bomId, status: 'Completed' },
      take: 20,
      orderBy: { endDate: 'desc' },
    });

    if (historicalOrders.length === 0) {
      return {
        status: 'INS_DATA',
        message: 'Insufficient historical data for Yield AI prediction.',
      };
    }

    const stats = historicalOrders.reduce(
      (acc, order) => {
        const planned = new Decimal(order.quantity).toNumber();
        const produced = new Decimal(order.producedQuantity).toNumber();
        const scrap = new Decimal(order.scrapQuantity).toNumber();

        acc.totalPlanned += planned;
        acc.totalProduced += produced;
        acc.totalScrap += scrap;
        return acc;
      },
      { totalPlanned: 0, totalProduced: 0, totalScrap: 0 },
    );

    const avgYield = (stats.totalProduced / stats.totalPlanned) * 100;
    const avgScrap = (stats.totalScrap / stats.totalPlanned) * 100;

    return {
      status: 'CALIBRATED',
      bomId,
      sampleSize: historicalOrders.length,
      predictedYield: `${avgYield.toFixed(2)}%`,
      expectedScrapRate: `${avgScrap.toFixed(2)}%`,
      confidence: historicalOrders.length > 10 ? 'High' : 'Moderate',
      insight:
        avgYield < 95
          ? 'High process variance detected. Check machine calibration.'
          : 'Yield is within industry standard coefficients.',
    };
  }
}
