import { Module, forwardRef } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { WarehouseService } from './warehouse.service';
import { InventoryController } from './inventory.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LedgerModule } from '../accounting/ledger.module';

import { SystemModule } from '../system/system.module';
import { CommonModule } from '../common/common.module';
import { HsnService } from './services/hsn.service';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [
    PrismaModule,
    LedgerModule,
    SystemModule,
    CommonModule,
    forwardRef(() => AccountingModule),
  ],
  controllers: [InventoryController],
  providers: [InventoryService, WarehouseService, HsnService],
  exports: [InventoryService, HsnService],
})
export class InventoryModule {}
