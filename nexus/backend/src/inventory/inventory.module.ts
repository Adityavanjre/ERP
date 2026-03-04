import { Module, forwardRef } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { WarehouseService } from './warehouse.service';
import { InventoryController } from './inventory.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LedgerModule } from '../accounting/ledger.module';

import { SystemModule } from '../system/system.module';
import { HsnService } from './services/hsn.service';

@Module({
  imports: [PrismaModule, LedgerModule, SystemModule],
  controllers: [InventoryController],
  providers: [InventoryService, WarehouseService, HsnService],
  exports: [InventoryService, HsnService],
})
export class InventoryModule { }
