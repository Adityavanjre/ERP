import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceService } from '../../accounting/services/invoice.service';
import { InventoryService } from '../../inventory/inventory.service';
import { TraceService } from '../../common/services/trace.service';

@Injectable()
export class PosService {
  constructor(
    private prisma: PrismaService,
    private invoiceService: InvoiceService,
    private inventoryService: InventoryService,
    private traceService: TraceService,
  ) {}

  /**
   * Retail Depth: Quick Checkout (Barcode Scan to Invoice)
   * Handles high-velocity transactions where local price overrides the default.
   */
  async quickCheckout(
    tenantId: string,
    data: {
      barcode: string;
      quantity: number;
      warehouseId: string;
      customerId?: string;
      paymentMode: 'Cash' | 'Card' | 'UPI';
    },
  ) {
    // 1. Resolve product and location-specific price
    const product = await this.prisma.product.findUnique({
      where: { tenantId_barcode: { tenantId, barcode: data.barcode } },
    });

    if (!product)
      throw new NotFoundException('Product not found for the given barcode.');

    const price = await this.inventoryService.getLocationPrice(
      tenantId,
      product.id,
      data.warehouseId,
    );

    // 2. Generate Instant Invoice
    const invoiceData = {
      customerId: data.customerId,
      items: [
        {
          productId: product.id,
          quantity: data.quantity,
          unitPrice: price,
        },
      ],
      paymentMethod: data.paymentMode,
      warehouseId: data.warehouseId,
      correlationId: this.traceService.getCorrelationId(),
      isPaid: true, // POS usually implies instant payment
    };

    return this.invoiceService.createInvoice(tenantId, invoiceData as any);
  }
}
