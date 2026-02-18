import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

import { AccountingService } from '../accounting/accounting.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private accountingService: AccountingService,
  ) {}

  async createOrder(tenantId: string, data: any) {
    const { items, customerId, idempotencyKey, ...orderData } = data;

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
    return this.prisma.$transaction(async (tx) => {
      // Validate customer exists
      if (customerId) {
        const customer = await tx.customer.findFirst({
          where: { id: customerId, tenantId, isDeleted: false },
        });
        if (!customer)
          throw new BadRequestException(`Customer ${customerId} not found`);
      }

      // Create Order
      const order = await tx.order.create({
        data: {
          ...orderData,
          tenantId,
          customerId,
          idempotencyKey,
          status: OrderStatus.Pending,
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
      // Stock deduction now happens inside AccountingService.createInvoice
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
