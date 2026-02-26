import { Module } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountingModule } from '../accounting/accounting.module';
import { SystemModule } from '../system/system.module';

@Module({
  imports: [PrismaModule, AccountingModule, SystemModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule { }
