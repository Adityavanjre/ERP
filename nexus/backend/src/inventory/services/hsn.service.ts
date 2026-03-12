import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class HsnService {
  constructor(private prisma: PrismaService) {}

  async getGstRate(
    tenantId: string,
    hsnCode: string,
    tx?: any,
  ): Promise<Decimal | null> {
    const client = tx || this.prisma;
    const hsn = await client.hsnMaster.findUnique({
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
    tx?: any,
  ): Promise<{ isValid: boolean; officialRate?: Decimal }> {
    const officialRate = await this.getGstRate(tenantId, hsnCode, tx);
    if (!officialRate) {
      return { isValid: true };
    }

    const isValid = new Decimal(rate).equals(officialRate);
    return { isValid, officialRate };
  }
}
