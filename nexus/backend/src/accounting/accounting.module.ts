import { Module, forwardRef } from '@nestjs/common';
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
import { FixedAssetService } from './services/fixed-asset.service';
import { TdsService } from './services/tds.service';
import { TdsController } from './controllers/tds.controller';
import { BrsService } from './services/brs.service';
import { BrsController } from './controllers/brs.controller';
import { InventoryModule } from '../inventory/inventory.module';


@Module({
  imports: [PrismaModule, SystemModule, forwardRef(() => InventoryModule)],
  controllers: [AccountingController, TdsController, BrsController],
  providers: [
    AccountingService,
    LedgerService,
    InvoiceService,
    PaymentService,
    TallyService,
    CreditNoteService,
    DebitNoteService,
    FixedAssetService,
    TdsService,
  ],

  exports: [
    AccountingService,
    LedgerService,
    InvoiceService,
    PaymentService,
    TallyService,
    CreditNoteService,
    DebitNoteService,
    FixedAssetService,
    TdsService,
  ],

})
export class AccountingModule { }
