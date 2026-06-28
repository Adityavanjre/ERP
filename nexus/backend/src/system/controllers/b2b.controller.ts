import {
  Controller,
  Get,
  UseGuards,
  Req,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { B2BGuard } from '../../common/guards/b2b.guard';
import { PrismaService } from '../../prisma/prisma.service';


import { AuthenticatedRequest } from '../../common/interfaces/request.interface';

@Controller('b2b')
@UseGuards(JwtAuthGuard, B2BGuard)
export class B2BController {
  constructor(private prisma: PrismaService) {}

  /**
   * CUSTOMER VIEW: My Invoices
   * PERF-004: Universal Pagination.
   */
  @Get('invoices')
  async getMyInvoices(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    if (!req.user.customerId) {
      throw new ForbiddenException('Endpoint restricted to Customers');
    }

    const take = Number(limit) || 20;
    const skip = ((Number(page) || 1) - 1) * take;

    return this.prisma.invoice.findMany({
      where: {
        tenantId: req.user.tenantId as string,
        customerId: req.user.customerId as string,
      },
      orderBy: { issueDate: 'desc' },
      skip,
      take,
    });
  }

  /**
   * SUPPLIER VIEW: My Purchase Orders
   * PERF-004: Universal Pagination.
   */
  @Get('purchase-orders')
  async getMyPurchaseOrders(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    if (!req.user.supplierId) {
      throw new ForbiddenException('Endpoint restricted to Suppliers');
    }

    const take = Number(limit) || 20;
    const skip = ((Number(page) || 1) - 1) * take;

    return this.prisma.purchaseOrder.findMany({
      where: {
        tenantId: req.user.tenantId as string,
        supplierId: req.user.supplierId as string,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  /**
   * PORTAL DASHBOARD: Get Summary Statistics
   */
  @Get('dashboard')
  async getPortalStats(@Req() req: AuthenticatedRequest) {
    const { tenantId, customerId, supplierId } = req.user;

    if (customerId) {
      const invoices = await this.prisma.invoice.aggregate({
        where: {
          tenantId: tenantId as string,
          customerId: customerId as string,
        },
        _sum: { totalAmount: true, amountPaid: true },
        _count: { id: true },
      });

      return {
        
        totalInvoices: invoices._count.id,
        outstandingAmount:
          Number(invoices._sum.totalAmount || 0) -
          Number(invoices._sum.amountPaid || 0),
      };
    } else {
      const pos = await this.prisma.purchaseOrder.aggregate({
        where: {
          tenantId: tenantId as string,
          supplierId: supplierId as string,
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      });

      return {
        
        totalPurchaseOrders: pos._count.id,
        totalVolume: Number(pos._sum.totalAmount || 0),
      };
    }
  }
}
