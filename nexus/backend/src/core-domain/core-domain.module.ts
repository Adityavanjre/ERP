import { Module } from '@nestjs/common';

// Domain modules that are SAFE to share
import { InventoryModule } from '../inventory/inventory.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [InventoryModule, AccountingModule],
  exports: [InventoryModule, AccountingModule],
})
export class CoreDomainModule {}
