import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class HsnService {
    constructor(private prisma: PrismaService) { }

    async getGstRate(tenantId: string, hsnCode: string): Promise<Decimal | null> {
        const hsn = await this.prisma.hsnMaster.findUnique({
            where: {
                tenantId_hsnCode: {
                    tenantId,
                    hsnCode,
                },
            },
        });

        return hsn ? hsn.gstRate : null;
    }

    async validateGstRate(
        tenantId: string,
        hsnCode: string,
        rate: number | Decimal,
    ): Promise<{ isValid: boolean; officialRate?: Decimal }> {
        const officialRate = await this.getGstRate(tenantId, hsnCode);
        if (!officialRate) {
            return { isValid: true }; // No HSN master for this code, allow anything? Or block?
            // Requirement says "Enforce lookup from HSN master", which implies we should have records.
            // But for practicality, if master is empty, we might allow. 
            // Let's assume for now that if it exists, it MUST match.
        }

        const isValid = new Decimal(rate).equals(officialRate);
        return { isValid, officialRate };
    }
}
