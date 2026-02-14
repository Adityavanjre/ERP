import {
  Controller,
  Get,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { B2BGuard } from '../../common/guards/b2b.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

@Controller('b2b')
@UseGuards(JwtAuthGuard, B2BGuard)
export class B2BController {
  constructor(private prisma: PrismaService) {}

  /**
   * CUSTOMER VIEW: My Invoices
   */
  @Get('invoices')
  async getMyInvoices(@Req() req: any) {
    if (req.user.role !== Role.Customer) {
      throw new ForbiddenException('Endpoint restricted to Customers');
    }

    return this.prisma.invoice.findMany({
      where: {
        tenantId: req.user.tenantId,
        customerId: req.user.customerId,
      },
      orderBy: { issueDate: 'desc' },
    });
  }

  /**
   * SUPPLIER VIEW: My Purchase Orders
   */
  @Get('purchase-orders')
  async getMyPurchaseOrders(@Req() req: any) {
    if (req.user.role !== Role.Supplier) {
      throw new ForbiddenException('Endpoint restricted to Suppliers');
    }

    return this.prisma.purchaseOrder.findMany({
      where: {
        tenantId: req.user.tenantId,
        supplierId: req.user.supplierId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * PORTAL DASHBOARD: Get Summary Statistics
   */
  @Get('dashboard')
  async getPortalStats(@Req() req: any) {
    const { tenantId, customerId, supplierId, role } = req.user;

    if (role === Role.Customer) {
      const invoices = await this.prisma.invoice.aggregate({
        where: { tenantId, customerId },
        _sum: { totalAmount: true, amountPaid: true },
        _count: { id: true },
      });

      return {
        role: 'Customer',
        totalInvoices: invoices._count.id,
        outstandingAmount: Number(invoices._sum.totalAmount || 0) - Number(invoices._sum.amountPaid || 0),
      };
    } else {
      const pos = await this.prisma.purchaseOrder.aggregate({
        where: { tenantId, supplierId },
        _sum: { totalAmount: true },
        _count: { id: true },
      });

      return {
        role: 'Supplier',
        totalPurchaseOrders: pos._count.id,
        totalVolume: Number(pos._sum.totalAmount || 0),
      };
    }
  }
}
