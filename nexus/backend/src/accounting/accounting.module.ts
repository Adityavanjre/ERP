import { Module } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { AccountingController } from './accounting.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SystemModule } from '../system/system.module';
import { LedgerService } from './services/ledger.service';
import { InvoiceService } from './services/invoice.service';
import { PaymentService } from './services/payment.service';
import { TallyService } from './services/tally-export.service';

@Module({
  imports: [PrismaModule, SystemModule],
  controllers: [AccountingController],
  providers: [
    AccountingService,
    LedgerService,
    InvoiceService,
    PaymentService,
    TallyService,
  ],
  exports: [
    AccountingService,
    LedgerService,
    InvoiceService,
    PaymentService,
    TallyService,
  ],
})
export class AccountingModule {}
