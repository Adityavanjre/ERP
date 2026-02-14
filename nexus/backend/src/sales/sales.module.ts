import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { PrismaModule } from '../prisma/prisma.module';

import { AccountingModule } from '../accounting/accounting.module';

import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, AccountingModule, CommonModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
