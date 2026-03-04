import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class EWayBillService {
    constructor(private prisma: PrismaService) { }

    /**
     * Generates JSON for NIC E-Way Bill Portal
     * Format compliant with National Informatics Centre (India)
     */
    async generateEWayBillJson(invoiceId: string, transportDetails: {
        transMode: string;      // 1-Road, 2-Rail, 3-Air, 4-Ship
        distance: number;       // Distance in KM
        transporterId?: string; // GSTIN of transporter
        transporterName?: string;
        transDocNo?: string;    // LR Number
        transDocDate?: string;  // LR Date (DD/MM/YYYY)
        vehicleNo?: string;     // Vehicle Registration Number
        vehicleType?: string;   // R-Regular, O-Over Dimensional Cargo
    }) {
        const invoice = await this.prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                items: { include: { product: true } },
                customer: true,
                tenant: true,
            },
        });

        if (!invoice) throw new BadRequestException('Invoice not found');
        if (!invoice.customer) throw new BadRequestException('Customer details missing for E-Way Bill');

        const tenant = invoice.tenant;
        const customer = invoice.customer;

        // NIC JSON Format v1.03
        return {
            supplyType: 'O', // Outward
            subSupplyType: '1', // Supply
            docType: 'INV',
            docNo: invoice.invoiceNumber,
            docDate: invoice.issueDate.toISOString().split('T')[0].split('-').reverse().join('/'),
            fromGstin: tenant.gstin || 'URP',
            fromTrdName: tenant.name,
            fromAddr1: tenant.address || '',
            fromAddr2: '',
            fromPlace: tenant.state || '',
            fromPincode: 0, // Should be in tenant model, fallback to 0
            fromStateCode: this.getStateCode(tenant.state || undefined),
            actualFromStateCode: this.getStateCode(tenant.state || undefined),
            toGstin: customer.gstin || 'URP',
            toTrdName: customer.company || `${customer.firstName} ${customer.lastName || ''}`,
            toAddr1: customer.address || '',
            toAddr2: '',
            toPlace: customer.state || '',
            toPincode: 0, // Should be in customer model
            toStateCode: this.getStateCode(customer.state || undefined),
            actualToStateCode: this.getStateCode(customer.state || undefined),
            transactionType: 1, // Regular
            dispatchFromPincode: 0,
            shipToPincode: 0,
            totalValue: invoice.totalTaxable.toNumber(),
            cgstValue: invoice.totalCGST.toNumber(),
            sgstValue: invoice.totalSGST.toNumber(),
            igstValue: invoice.totalIGST.toNumber(),
            cessValue: 0,
            totInvValue: invoice.totalAmount.toNumber(),
            mainHsnCode: invoice.items[0]?.hsnCode ? parseInt(invoice.items[0].hsnCode) : 0,
            itemList: invoice.items.map((item, idx) => ({
                itemNo: idx + 1,
                productName: item.productName || item.product.name,
                productDesc: item.product.description || '',
                hsnCode: parseInt(item.hsnCode || '0'),
                quantity: item.quantity.toNumber(),
                qtyUnit: 'NOS', // In a real app, this should be from UoM master
                taxableAmount: item.taxableAmount.toNumber(),
                sgstRate: item.igstAmount.greaterThan(0) ? 0 : item.gstRate.toNumber() / 2,
                cgstRate: item.igstAmount.greaterThan(0) ? 0 : item.gstRate.toNumber() / 2,
                igstRate: item.igstAmount.greaterThan(0) ? item.gstRate.toNumber() : 0,
                cessRate: 0,
            })),
            transMode: transportDetails.transMode,
            distance: isNaN(Number(transportDetails.distance)) ? 0 : Math.round(Number(transportDetails.distance)),
            transporterId: transportDetails.transporterId || '',
            transporterName: transportDetails.transporterName || '',
            transDocNo: transportDetails.transDocNo || '',
            transDocDate: transportDetails.transDocDate || '',
            vehicleNo: transportDetails.vehicleNo || '',
            vehicleType: transportDetails.vehicleType || 'R',
        };
    }

    private getStateCode(stateName?: string): number {
        const codes: Record<string, number> = {
            'Jammu & Kashmir': 1, 'Himachal Pradesh': 2, 'Punjab': 3, 'Chandigarh': 4,
            'Uttarakhand': 5, 'Haryana': 6, 'Delhi': 7, 'Rajasthan': 8, 'Uttar Pradesh': 9,
            'Bihar': 10, 'Sikkim': 11, 'Arunachal Pradesh': 12, 'Nagaland': 13, 'Manipur': 14,
            'Mizoram': 15, 'Tripura': 16, 'Meghalaya': 17, 'Assam': 18, 'West Bengal': 19,
            'Jharkhand': 20, 'Odisha': 21, 'Chhattisgarh': 22, 'Madhya Pradesh': 23,
            'Gujarat': 24, 'Dadra & Nagar Haveli': 26, 'Daman & Diu': 26, 'Maharashtra': 27,
            'Karnataka': 29, 'Goa': 30, 'Lakshadweep': 31, 'Kerala': 32, 'Tamil Nadu': 33,
            'Puducherry': 34, 'Andaman & Nicobar Islands': 35, 'Telangana': 36, 'Andhra Pradesh': 37,
            'Ladakh': 38,
        };
        return stateName ? codes[stateName] || 0 : 0;
    }
}
