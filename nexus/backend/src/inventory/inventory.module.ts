import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { WarehouseService } from './warehouse.service';
import { InventoryController } from './inventory.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountingModule } from '../accounting/accounting.module';

import { SystemModule } from '../system/system.module';

@Module({
  imports: [PrismaModule, AccountingModule, SystemModule],
  controllers: [InventoryController],
  providers: [InventoryService, WarehouseService],
})
export class InventoryModule {}
