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
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
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
  @Roles(Role.Owner, Role.Customer)
  async getMyInvoices(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    if (req.user.role !== Role.Customer) {
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
  @Roles(Role.Owner, Role.Supplier)
  async getMyPurchaseOrders(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    if (req.user.role !== Role.Supplier) {
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
  @Roles(Role.Owner, Role.Customer, Role.Supplier)
  async getPortalStats(@Req() req: AuthenticatedRequest) {
    const { tenantId, customerId, supplierId, role } = req.user;

    if (role === Role.Customer) {
      const invoices = await this.prisma.invoice.aggregate({
        where: {
          tenantId: tenantId as string,
          customerId: customerId as string,
        },
        _sum: { totalAmount: true, amountPaid: true },
        _count: { id: true },
      });

      return {
        role: 'Customer',
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
        role: 'Supplier',
        totalPurchaseOrders: pos._count.id,
        totalVolume: Number(pos._sum.totalAmount || 0),
      };
    }
  }
}
