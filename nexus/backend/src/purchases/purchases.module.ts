import { Module } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { PurchaseBillService } from './purchase-bill.service';
import { PurchaseBillController } from './purchase-bill.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountingModule } from '../accounting/accounting.module';
import { SystemModule } from '../system/system.module';

@Module({
  imports: [PrismaModule, AccountingModule, SystemModule],
  controllers: [PurchasesController, PurchaseBillController],
  providers: [PurchasesService, PurchaseBillService],
  exports: [PurchaseBillService],
})
export class PurchasesModule {}
