import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { PrismaModule } from '../prisma/prisma.module';

import { AccountingModule } from '../accounting/accounting.module';

import { CommonModule } from '../common/common.module';

import { InventoryModule } from '../inventory/inventory.module';
import { PosService } from './services/pos.service';

import { SystemModule } from '../system/system.module';

@Module({
  imports: [PrismaModule, AccountingModule, CommonModule, InventoryModule, SystemModule],
  controllers: [SalesController],
  providers: [SalesService, PosService],
  exports: [SalesService, PosService],
})
export class SalesModule { }
