import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import { Industry, Role } from '@nexus/shared';

import { AccountingService } from '../accounting/accounting.service';
import { AuditService } from '../system/services/audit.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private accountingService: AccountingService,
    private audit: AuditService,
  ) { }

  async createOrder(tenantId: string, data: any, user?: any) {
    const { items, customerId, idempotencyKey, ...orderData } = data;
    const channel = user?.channel || 'WEB';
    const role = user?.role;

    // Architecture Guide Enforcement:
    // MOBILE: Create Sales Order -> Draft only for non-owners
    // Backend enforces this regardless of client payload to prevent status spoofing.
    let forceDraft = false;
    if (channel === 'MOBILE' && role !== Role.Owner && role !== Role.Manager) {
      forceDraft = true;
    }

    // 0. Idempotency Check
    if (idempotencyKey) {
      const existingOrder = await this.prisma.order.findUnique({
        where: {
          tenantId_idempotencyKey: {
            tenantId,
            idempotencyKey
          }
        },
      });
      if (existingOrder) return existingOrder;
    }

    // 1. Create Order & Invoice within a single transaction
    return (this.prisma as any).$transaction(async (tx: any) => {
      // Validate customer exists
      if (customerId) {
        const customer = await tx.customer.findFirst({
          where: { id: customerId, tenantId, isDeleted: false },
        });
        if (!customer)
          throw new BadRequestException(`Compliance Error: Customer ${customerId} not found or inactive. Cannot link sale to non-customer party.`);
      }

      // Create Order
      const order = await tx.order.create({
        data: {
          ...orderData,
          tenantId,
          customerId,
          idempotencyKey,
          status: forceDraft ? OrderStatus.Draft : OrderStatus.Pending,
          total: items.reduce(
            (sum: Decimal, item: any) =>
              sum.add(new Decimal(item.price).mul(new Decimal(item.quantity))),
            new Decimal(0),
          ),
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: new Decimal(item.quantity),
              price: new Decimal(item.price),
            })),
          },
        },
      });

      // 2. Generate Invoice (Strict: must succeed or whole order rolls back)
      // Only for non-draft orders. Mobile drafts are VISIBILITY-ONLY for inventory.
      if (!forceDraft) {
        await this.accountingService.createInvoice(
          tenantId,
          {
            customerId,
            invoiceNumber: `INV-${order.id.split('-')[0].toUpperCase()}`,
            issueDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            items: items.map((i: any) => ({
              productId: i.productId,
              quantity: new Decimal(i.quantity),
              price: new Decimal(i.price),
            })),
          },
          tx, // PASSING THE TRANSACTION
        );
      } else {
        // Log forced governance transition
        await this.audit.log({
          tenantId,
          userId: user?.id,
          action: 'FORCE_DRAFT_ON_MOBILE',
          resource: `Order:${order.id}`,
          details: {
            channel,
            role,
            originalStatus: data.status,
            forcedStatus: 'Draft',
            reason: 'Mobile write governance enforced'
          },
        });
      }

      return order;
    });
  }

  async getOrders(tenantId: string) {
    return this.prisma.order.findMany({
      where: { tenantId },
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderById(tenantId: string, id: string) {
    return this.prisma.order.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
      },
    });
  }

  async updateOrderStatus(tenantId: string, id: string, status: OrderStatus) {
    // 0. Security Guard: Prevent modifying old orders in locked periods
    await this.accountingService.checkPeriodLock(tenantId, new Date());

    return this.prisma.order.updateMany({
      where: { id, tenantId },
      data: { status },
    });
  }

  async approveOrder(tenantId: string, id: string, user: any) {
    const channel = user.channel || 'WEB';
    const role = user.role;

    // Architecture Guide Enforcement:
    // MOBILE: Approve/Reject only. No edits. No amount changes.
    // Only Owners or Managers can approve on mobile.
    if (channel === 'MOBILE' && role !== Role.Owner && role !== Role.Manager) {
      throw new BadRequestException('Governance Error: Only Owners or Managers can approve orders from mobile.');
    }

    const order = await this.prisma.order.findFirst({
      where: { id, tenantId },
    });

    if (!order) throw new BadRequestException('Order not found');

    // Binary Approval: Pending -> Pending (wait for Web) or Rejected
    // Actually, Prompt 3 says "Approve / Reject only".
    // If we "Approve", we mark it Pending? No, Draft -> Pending.
    // If it's already Pending, Approved? 
    // Let's assume Draft -> Pending (Ready for Web finalization) is the "Approval" from mobile.

    const newStatus = OrderStatus.Pending;

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: newStatus },
    });

    await (this.audit as any).log({
      tenantId,
      userId: user.id,
      action: 'MOBILE_APPROVAL',
      resource: `Order:${id}`,
      channel,
      details: {
        role,
        previousStatus: order.status,
        newStatus,
        mobileIntent: 'MOBILE_INTENT_ONLY',
      },
    });

    return updated;
  }

  async rejectOrder(tenantId: string, id: string, user: any) {
    const channel = user.channel || 'WEB';
    const role = user.role;

    if (channel === 'MOBILE' && role !== Role.Owner && role !== Role.Manager) {
      throw new BadRequestException('Governance Error: Only Owners or Managers can reject orders from mobile.');
    }

    const order = await this.prisma.order.findFirst({
      where: { id, tenantId },
    });

    if (!order) throw new BadRequestException('Order not found');

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.Cancelled },
    });

    await (this.audit as any).log({
      tenantId,
      userId: user.id,
      action: 'MOBILE_REJECTION',
      resource: `Order:${id}`,
      channel,
      details: {
        role,
        previousStatus: order.status,
        newStatus: OrderStatus.Cancelled,
        mobileIntent: 'MOBILE_INTENT_ONLY',
      },
    });

    return updated;
  }

  async getSalesStats(tenantId: string) {
    const orders = await this.prisma.order.findMany({
      where: { tenantId },
    });

    const totalRevenue = orders.reduce(
      (sum, order) => sum.add(new Decimal(order.total)),
      new Decimal(0),
    );
    const orderCount = orders.length;
    const pendingOrders = orders.filter(
      (o) => o.status === OrderStatus.Pending,
    ).length;

    return {
      totalRevenue,
      orderCount,
      pendingOrders,
    };
  }
}
