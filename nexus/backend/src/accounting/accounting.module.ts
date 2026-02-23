import { Module } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { AccountingController } from './accounting.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SystemModule } from '../system/system.module';
import { LedgerService } from './services/ledger.service';
import { InvoiceService } from './services/invoice.service';
import { PaymentService } from './services/payment.service';
import { TallyService } from './services/tally-export.service';
import { CreditNoteService } from './services/credit-note.service';
import { DebitNoteService } from './services/debit-note.service';

@Module({
  imports: [PrismaModule, SystemModule],
  controllers: [AccountingController],
  providers: [
    AccountingService,
    LedgerService,
    InvoiceService,
    PaymentService,
    TallyService,
    CreditNoteService,
    DebitNoteService,
  ],
  exports: [
    AccountingService,
    LedgerService,
    InvoiceService,
    PaymentService,
    TallyService,
    CreditNoteService,
    DebitNoteService,
  ],
})
export class AccountingModule {}
